import axios from 'axios'

export async function searchCompetitorVideos(topic) {
  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data } = await axios.get(
    'https://www.googleapis.com/youtube/v3/search',
    {
      params: {
        part: 'snippet',
        q: topic,
        type: 'video',
        order: 'viewCount',
        publishedAfter,
        maxResults: 10,
        key: import.meta.env.VITE_YOUTUBE_API_KEY,
      },
    },
  )

  return data.items ?? []
}
