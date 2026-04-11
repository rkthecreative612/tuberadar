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

async function fetchSearchWithStats(searchQuery, daysAgo = 2) {
  const publishedAfter = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY

  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      order: 'viewCount',
      publishedAfter,
      maxResults: 10,
      key: apiKey,
    },
  })

  const rawItems = data.items ?? []
  const searchItems = rawItems.filter((item) => !isShortByTitle(item))

  const videoIds = searchItems.map((item) => item?.id?.videoId).filter(Boolean)

  if (videoIds.length === 0) {
    return searchItems.map((item) => ({
      ...item,
      viewCount: 0,
      likeCount: 0,
    }))
  }

  const { data: statsData } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics',
      id: videoIds.join(','),
      key: apiKey,
    },
  })

  const statsItems = statsData?.items ?? []
  const statsById = new Map(statsItems.map((v) => [v?.id, v?.statistics]))

  return searchItems.map((item) => {
    const videoId = item?.id?.videoId
    const stats = statsById.get(videoId)

    const viewCount = stats?.viewCount != null ? Number(stats.viewCount) : 0
    const likeCount = stats?.likeCount != null ? Number(stats.likeCount) : 0

    return {
      ...item,
      statistics: {
        ...(item.statistics ?? {}),
        viewCount,
        likeCount,
      },
      viewCount,
      likeCount,
    }
  })
}

export async function searchByKeywords(topic, _contentType = 'videos', daysAgo = 2) {
  try {
    const q = String(topic ?? '').trim()
    if (!q) return []
    return await fetchSearchWithStats(q, daysAgo)
  } catch (e) {
    console.log(e)
    return []
  }
}

export async function searchByChannel(channelUrlOrHandle, _contentType = 'videos', daysAgo = 2) {
  try {
    const handle = extractHandleForChannelSearch(channelUrlOrHandle)
    if (!handle) return []
    return await fetchSearchWithStats(handle, daysAgo)
  } catch (e) {
    console.log(e)
    return []
  }
}
