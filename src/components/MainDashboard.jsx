import { useState, useEffect } from 'react'
import { searchByChannel, searchByKeywords } from '../lib/youtube'
import supabase from '../lib/supabase'

function MainDashboard({
  searchTopic = 'tech review india 2026',
  channelName = 'TechTalks IN',
  contentType = 'videos',
  isChannelUrl = false,
}) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchVideos() {
    setLoading(true)
    setError(null)
    try {
      const items = isChannelUrl
        ? await searchByChannel(searchTopic, contentType)
        : await searchByKeywords(searchTopic, contentType)
      const mapped = items.map((item) => ({
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.default.url,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.viewCount ?? 0,
        likeCount: item.likeCount ?? 0,
        views: item.viewCount ?? 0,
        performanceTag:
          (item.viewCount ?? 0) > 500000
            ? 'Viral'
            : (item.viewCount ?? 0) > 100000
              ? 'Trending'
              : 'Steady',
      }))

      if (mapped.length > 0) {
        const rows = mapped.map((v) => ({
          title: v.title,
          channel_name: v.channelName,
          video_id: v.videoId,
          thumbnail: v.thumbnail,
          published_at: v.publishedAt,
          views: v.views,
          performance_tag: v.performanceTag,
        }))
        const { error: insertError } = await supabase
          .from('competitor_videos')
          .insert(rows)
        if (insertError) {
          console.error(insertError)
          setError(insertError.message)
        }
      }

      setVideos(mapped)
    } catch (e) {
      console.error(e)
      setError(e?.message ?? 'Failed to load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchVideos()
  }, [searchTopic, contentType, isChannelUrl])

  const timeAgo = (dateString) => {
    const d = new Date(dateString)
    const ms = Date.now() - d.getTime()
    if (!Number.isFinite(ms)) return '—'
    const mins = Math.floor(ms / (60 * 1000))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
    const days = Math.floor(hrs / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const calcScore = (video) => {
    const viewCount = Number(video?.viewCount) || 0
    const likeCount = Number(video?.likeCount) || 0
    const title = String(video?.title ?? '')

    const viewPoints = Math.min(40, (viewCount / 500000) * 40)
    const likePoints = Math.min(30, (likeCount / 10000) * 30)
    const titleLengthPoints =
      title.length >= 40 && title.length <= 70 ? 15 : 0
    const hasNumbersPoints = /\d/.test(title) ? 15 : 0

    const score = viewPoints + likePoints + titleLengthPoints + hasNumbersPoints
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const formatCompact = (value) => {
    const n = Number(value) || 0
    const stripTrailingZero = (s) => s.replace(/\.0$/, '')

    if (n >= 1000000) return `${stripTrailingZero((n / 1000000).toFixed(1))}M`
    if (n >= 1000) return `${stripTrailingZero((n / 1000).toFixed(1))}K`
    return String(n)
  }

  const totalVideos = videos.length
  const avgViews = totalVideos
    ? Math.round(
        videos.reduce((sum, v) => sum + (Number(v.viewCount) || 0), 0) /
          totalVideos,
      )
    : 0
  const hotTopic = videos[0]?.channelName ?? '—'
  const hotTopicCount = videos.filter((v) => v.channelName === hotTopic).length
  const lowestViewsVideo = videos.reduce((min, v) => {
    const vViews = Number(v.viewCount) || 0
    const minViews = Number(min?.viewCount) || 0
    return vViews < minViews ? v : min
  }, null)
  const gapChannel = lowestViewsVideo?.channelName ?? '—'
  const gapViews = Number(lowestViewsVideo?.viewCount) || 0

  const rootStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    backgroundColor: '#111111',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  }

  const topBarStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    backgroundColor: '#0a0a0a',
    padding: '16px 24px',
    flexShrink: 0,
    boxSizing: 'border-box',
  }

  const topBarLeftStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  }

  const topTitleStyle = {
    margin: 0,
    fontSize: '16px',
    fontWeight: 500,
    color: '#ffffff',
    lineHeight: 1.3,
    fontFamily: 'system-ui, sans-serif',
  }

  const topSubtitleStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    lineHeight: 1.3,
    fontFamily: 'system-ui, sans-serif',
  }

  const refreshButtonStyle = {
    flexShrink: 0,
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    border: '1px solid #444444',
    borderRadius: '6px',
    cursor: 'pointer',
  }

  const scrollAreaStyle = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
  }

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    boxSizing: 'border-box',
  }

  const statCardStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
  }

  const statLabelStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    fontWeight: 500,
    fontFamily: 'system-ui, sans-serif',
  }

  const statValueStyle = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.2,
  }

  const statHintGreenStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#4caf50',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.3,
  }

  const statHintNeutralStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.3,
  }

  const sectionHeaderStyle = {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
  }

  const videoListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }

  const videoRowStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '10px 14px',
    boxSizing: 'border-box',
    cursor: 'pointer',
  }

  const videoBodyStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }

  const videoTitleStyle = {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.3,
  }

  const videoMetaStyle = {
    margin: 0,
    fontSize: '12px',
    color: '#888888',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.3,
  }

  const tagBaseStyle = {
    flexShrink: 0,
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'system-ui, sans-serif',
    whiteSpace: 'nowrap',
  }

  const tagTrendingStyle = {
    ...tagBaseStyle,
    color: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  }

  const tagViralStyle = {
    ...tagBaseStyle,
    color: '#ff5252',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
  }

  const tagSteadyStyle = {
    ...tagBaseStyle,
    color: '#42a5f5',
    backgroundColor: 'rgba(66, 165, 245, 0.12)',
  }

  const scoreBadgeBaseStyle = {
    ...tagBaseStyle,
  }

  const scoreBadgeGoodStyle = {
    ...scoreBadgeBaseStyle,
    color: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  }

  const scoreBadgeMidStyle = {
    ...scoreBadgeBaseStyle,
    color: '#ffb74d',
    backgroundColor: 'rgba(255, 183, 77, 0.12)',
  }

  const scoreBadgeLowStyle = {
    ...scoreBadgeBaseStyle,
    color: '#ff5252',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
  }

  const badgesWrapStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const loadingVideosStyle = {
    margin: 0,
    fontSize: '14px',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
  }

  const errorVideosStyle = {
    margin: 0,
    fontSize: '13px',
    color: '#ff5252',
    fontFamily: 'system-ui, sans-serif',
  }

  return (
    <main style={rootStyle}>
      <header style={topBarStyle}>
        <div style={topBarLeftStyle}>
          <h1 style={topTitleStyle}>Competitor Feed — {channelName}</h1>
          <p style={topSubtitleStyle}>
            Last 48 hrs · Auto-refreshes daily at 8:00 AM
          </p>
        </div>
        <button type="button" style={refreshButtonStyle} onClick={() => void fetchVideos()}>
          ↻ Refresh Now
        </button>
      </header>

      <div style={scrollAreaStyle}>
        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Videos Found</p>
            <p style={statValueStyle}>{totalVideos}</p>
            <p style={statHintGreenStyle}>↑ {totalVideos} in 48 hrs</p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Avg Views</p>
            <p style={statValueStyle}>{formatCompact(avgViews)}</p>
            <p style={statHintGreenStyle}>↑ vs your avg</p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Hot Topic</p>
            <p style={statValueStyle}>{hotTopic}</p>
            <p style={statHintNeutralStyle}>
              {hotTopicCount} videos from hot topic
            </p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Gap Opportunity</p>
            <p style={statValueStyle}>{gapChannel}</p>
            <p style={statHintGreenStyle}>
              ↓ {formatCompact(gapViews)} views
            </p>
          </div>
        </div>

        <h2 style={sectionHeaderStyle}>Top performing — last 48 hrs</h2>

        {error ? <p style={errorVideosStyle}>{error}</p> : null}

        {loading ? (
          <p style={loadingVideosStyle}>Loading competitor videos...</p>
        ) : (
          <div style={videoListStyle}>
            {videos.map((v) => (
              // eslint-disable-next-line no-shadow
              <div
                key={v.videoId}
                style={videoRowStyle}
                onClick={() =>
                  window.open(`https://www.youtube.com/watch?v=${v.videoId}`, '_blank')
                }
              >
                <div style={videoBodyStyle}>
                  <p style={videoTitleStyle}>{v.title}</p>
                  <p style={videoMetaStyle}>
                    {v.channelName} · {timeAgo(v.publishedAt)} · {formatCompact(v.viewCount)} views
                  </p>
                </div>
                <div style={badgesWrapStyle}>
                  <span
                    style={
                      calcScore(v) > 70
                        ? scoreBadgeGoodStyle
                        : calcScore(v) > 40
                          ? scoreBadgeMidStyle
                          : scoreBadgeLowStyle
                    }
                  >
                    Score: {calcScore(v)}%
                  </span>
                  <span
                    style={
                      v.performanceTag === 'Viral'
                        ? tagViralStyle
                        : v.performanceTag === 'Steady'
                          ? tagSteadyStyle
                          : tagTrendingStyle
                    }
                  >
                    {v.performanceTag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default MainDashboard
