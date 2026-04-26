import axios from 'axios'

/**
 * If URL contains "@", take everything after the last "@"
 * (stops at / ? & or whitespace). If no "@", strip a leading "@"
 * from a bare handle.
 */
function extractHandleForChannelSearch(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''

  if (s.includes('@')) {
    const idx = s.lastIndexOf('@')
    let rest = s.slice(idx + 1)
    rest = rest.split(/[/?&\s]/)[0] ?? ''
    return rest
  }

  return s.replace(/^@/, '')
}

function isShortByTitle(item) {
  const title = String(item?.snippet?.title ?? '')
  const lower = title.toLowerCase()
  return lower.includes('#shorts') || lower.includes('#short')
}

async function fetchSearchWithStats(searchQuery, daysAgo = 2, channelId = null, maxResults = 12) {
  const publishedAfter = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY

  const params = {
    part: 'snippet',
    q: searchQuery,
    type: 'video',
    videoDuration: 'medium',
    order: 'viewCount',
    publishedAfter,
    maxResults,
    key: apiKey,
  }

  if (channelId) {
    params.channelId = channelId
  }

  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', { params })

  const rawItems = data.items ?? []
  const searchItems = rawItems.filter((item) => !isShortByTitle(item))

  const videoIds = searchItems.map((item) => item?.id?.videoId).filter(Boolean)

  if (videoIds.length === 0) {
    return searchItems.map((item) => ({
      ...item,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      description: item?.snippet?.description ?? '',
    }))
  }

  const { data: statsData } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      // Need snippet.description + statistics.commentCount (and keep duration).
      part: 'statistics,snippet,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    },
  })

  const statsItems = statsData?.items ?? []
  const statsById = new Map(statsItems.map((v) => [v?.id, v]))

  const mappedItems = searchItems.map((item) => {
    const videoId = item?.id?.videoId
    const videoDetails = statsById.get(videoId)
    const stats = videoDetails?.statistics
    const durationStr = videoDetails?.contentDetails?.duration || ''
    const mergedSnippet = {
      ...(item?.snippet ?? {}),
      ...(videoDetails?.snippet ?? {}),
    }

    const viewCount = stats?.viewCount != null ? Number(stats.viewCount) : 0
    const likeCount = stats?.likeCount != null ? Number(stats.likeCount) : 0
    const commentCount = stats?.commentCount != null ? Number(stats.commentCount) : 0
    const description = mergedSnippet?.description ?? ''

    return {
      ...item,
      snippet: mergedSnippet,
      durationStr,
      statistics: {
        ...(item.statistics ?? {}),
        viewCount,
        likeCount,
        commentCount,
      },
      viewCount,
      likeCount,
      commentCount,
      description,
    }
  })

  return mappedItems.filter((item) => {
    const dur = item.durationStr || ''
    const isShortDuration = dur.startsWith('PT') && !dur.includes('M') && !dur.includes('H')
    return !isShortDuration
  })
}

export async function searchByKeywords(topic, _contentType = 'videos', daysAgo = 2, maxResults = 12) {
  try {
    const q = String(topic ?? '').trim()
    if (!q) return []
    return await fetchSearchWithStats(q, daysAgo, null, maxResults)
  } catch (e) {
    console.log(e)
    return []
  }
}

export async function searchByChannel(channelUrlOrHandle, _contentType = 'videos', daysAgo = 2, maxResults = 12) {
  try {
    const handle = extractHandleForChannelSearch(channelUrlOrHandle)
    if (!handle) return []

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    const handleWithAt = handle.startsWith('@') ? handle : `@${handle}`
    
    // Resolve channel handle to channelId
    const { data: channelData } = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'id', forHandle: handleWithAt, key: apiKey }
    }).catch(() => ({ data: null }))
    
    const channelId = channelData?.items?.[0]?.id

    return await fetchSearchWithStats(handle, daysAgo, channelId, maxResults)
  } catch (e) {
    console.log(e)
    return []
  }
}

export async function searchChannelByKeyword(keyword, channelHandle, searchFields = ['title']) {
  /**
   * Search within a specific YouTube channel by keyword
   * Returns videos where keyword appears in title or description based on searchFields array
   */
  
  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API Key not found');
    return [];
  }

  try {
    // Get channel ID from handle
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelHandle)}&type=channel&maxResults=1&key=${YOUTUBE_API_KEY}`
    );
    
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return [];
    }
    
    const channelId = channelData.items[0].id.channelId;

    // Search videos in that channel by keyword
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(keyword)}&maxResults=50&type=video&key=${YOUTUBE_API_KEY}`
    );
    
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // Get video statistics
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    const statsData = await statsResponse.json();

    // Filter & format videos
    const videos = statsData.items
      .filter(video => {
        const title = video.snippet.title.toLowerCase();
        const description = video.snippet.description.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        
        const matchTitle = searchFields.includes('title') && title.includes(keywordLower);
        const matchDescription = searchFields.includes('description') && description.includes(keywordLower);
        
        return matchTitle || matchDescription;
      })
      .filter(video => {
        // Exclude shorts (< 60 seconds)
        const duration = video.contentDetails.duration;
        const durationSeconds = convertDurationToSeconds(duration);
        return durationSeconds >= 60;
      })
      .map(video => ({
        title: video.snippet.title,
        views: parseInt(video.statistics.viewCount || 0),
        likes: parseInt(video.statistics.likeCount || 0),
        thumbnail: video.snippet.thumbnails.medium.url,
        videoId: video.id,
        publishedAt: new Date(video.snippet.publishedAt),
        description: video.snippet.description,
        commentCount: parseInt(video.statistics.commentCount || 0),
        duration: video.contentDetails.duration
      }))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)); // Newest first

    return videos;

  } catch (error) {
    console.error('Error searching channel:', error);
    return [];
  }
}

function convertDurationToSeconds(duration) {
  /**
   * Convert ISO 8601 duration (PT15M32S) to seconds
   */
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  
  const hours = parseInt(matches?.[1] || 0);
  const minutes = parseInt(matches?.[2] || 0);
  const seconds = parseInt(matches?.[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}
