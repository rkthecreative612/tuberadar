import axios from 'axios'

/** In-memory cache: handle -> { channelId, uploadsPlaylistId } */
const channelCache = new Map()

export class YouTubeQuotaError extends Error {
  constructor(message = 'YouTube API daily quota exceeded. Try again tomorrow or use a new API key.') {
    super(message)
    this.name = 'YouTubeQuotaError'
  }
}

function isQuotaExceededError(err) {
  const status = err?.response?.status
  const message = String(err?.response?.data?.error?.message ?? '')
  return status === 403 || status === 429 || /quota/i.test(message)
}

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
    type: 'video',
    order: 'viewCount',
    publishedAfter,
    maxResults,
    key: apiKey,
  }

  if (channelId) {
    // Channel-scoped search: omit q so we get all uploads from the channel,
    // not only videos whose title/description mention the handle.
    params.channelId = channelId
  } else {
    params.q = searchQuery
    params.videoDuration = 'medium'
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

function mapStatsOntoItems(items, getVideoId) {
  return items.map((item) => {
    const videoId = getVideoId(item)
    const videoDetails = item._videoDetails
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
      id: { videoId },
      snippet: mergedSnippet,
      durationStr,
      statistics: { viewCount, likeCount, commentCount },
      viewCount,
      likeCount,
      commentCount,
      description,
    }
  })
}

async function fetchVideoStats(videoIds, apiKey) {
  if (videoIds.length === 0) return new Map()

  const { data: statsData } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics,snippet,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    },
  })

  return new Map((statsData?.items ?? []).map((v) => [v?.id, v]))
}

function filterNonShortVideos(items) {
  return items.filter((item) => {
    const dur = item.durationStr || ''
    const isShortDuration = dur.startsWith('PT') && !dur.includes('M') && !dur.includes('H')
    return !isShortDuration
  })
}

/** Resolve handle via channels.list (1 quota unit). Falls back to search only if needed. */
async function resolveChannel(handleWithAt, apiKey) {
  const cacheKey = handleWithAt.toLowerCase()
  if (channelCache.has(cacheKey)) return channelCache.get(cacheKey)

  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'id,contentDetails', forHandle: handleWithAt, key: apiKey },
    })
    const item = data?.items?.[0]
    if (item?.id) {
      const resolved = {
        channelId: item.id,
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
      }
      channelCache.set(cacheKey, resolved)
      return resolved
    }
  } catch (err) {
    if (isQuotaExceededError(err)) throw new YouTubeQuotaError()
    console.warn(
      `resolveChannel: channels.list failed for "${handleWithAt}", trying search fallback`,
      err.response?.data?.error?.message ?? err.message,
    )
  }

  // Fallback: search.list costs 100 units — only when channels.list returns nothing.
  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: handleWithAt,
        type: 'channel',
        maxResults: 1,
        key: apiKey,
      },
    })
    const channelId = data?.items?.[0]?.id?.channelId
    if (!channelId) return null

    const { data: channelData } = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'contentDetails', id: channelId, key: apiKey },
    })
    const resolved = {
      channelId,
      uploadsPlaylistId: channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null,
    }
    channelCache.set(cacheKey, resolved)
    return resolved
  } catch (err) {
    if (isQuotaExceededError(err)) throw new YouTubeQuotaError()
    throw err
  }
}

/** Fetch recent uploads via playlistItems (1 unit) + videos stats (1 unit). */
async function fetchChannelUploadsWithStats(uploadsPlaylistId, daysAgo, maxResults, apiKey) {
  const publishedAfterMs = Date.now() - daysAgo * 24 * 60 * 60 * 1000

  const { data: playlistData } = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      key: apiKey,
    },
  })

  const rawItems = (playlistData?.items ?? []).filter((item) => {
    const publishedAt = new Date(item?.snippet?.publishedAt ?? 0).getTime()
    if (publishedAt < publishedAfterMs) return false
    return !isShortByTitle({ snippet: item.snippet })
  })

  if (rawItems.length === 0) return []

  const videoIds = rawItems.map((item) => item?.snippet?.resourceId?.videoId).filter(Boolean)
  const statsById = await fetchVideoStats(videoIds, apiKey)

  const withStats = rawItems.map((item) => ({
    ...item,
    _videoDetails: statsById.get(item?.snippet?.resourceId?.videoId),
  }))

  const mappedItems = mapStatsOntoItems(withStats, (item) => item?.snippet?.resourceId?.videoId)

  return filterNonShortVideos(mappedItems)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, maxResults)
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
    if (!handle) {
      console.warn('searchByChannel: no handle extracted from input', channelUrlOrHandle)
      return []
    }

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      console.error('searchByChannel: YouTube API key not found')
      return []
    }

    const handleWithAt = handle.startsWith('@') ? handle : `@${handle}`

    const channel = await resolveChannel(handleWithAt, apiKey)
    if (!channel?.channelId) {
      console.error(`searchByChannel: no channel found for handle "${handleWithAt}"`)
      return []
    }

    if (channel.uploadsPlaylistId) {
      return await fetchChannelUploadsWithStats(
        channel.uploadsPlaylistId,
        daysAgo,
        maxResults,
        apiKey,
      )
    }

    // Last resort if uploads playlist is missing.
    return await fetchSearchWithStats('', daysAgo, channel.channelId, maxResults)
  } catch (e) {
    if (e instanceof YouTubeQuotaError) throw e
    if (isQuotaExceededError(e)) throw new YouTubeQuotaError()
    console.error('searchByChannel: unexpected error', e)
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
