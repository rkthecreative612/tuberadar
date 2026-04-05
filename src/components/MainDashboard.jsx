import { useState, useEffect } from 'react'
import { searchCompetitorVideos } from '../lib/youtube'
import supabase from '../lib/supabase'

function MainDashboard() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchVideos() {
    setLoading(true)
    setError(null)
    try {
      const items = await searchCompetitorVideos('tech review india 2026')
      const mapped = items.map((item) => ({
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.default.url,
        publishedAt: item.snippet.publishedAt,
        views: 0,
        performanceTag: 'Trending',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run fetch once on mount
  }, [])

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
          <h1 style={topTitleStyle}>Competitor Feed — TechTalks IN</h1>
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
            <p style={statValueStyle}>24</p>
            <p style={statHintGreenStyle}>↑ 6 new today</p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Avg Views</p>
            <p style={statValueStyle}>84K</p>
            <p style={statHintGreenStyle}>↑ vs your avg</p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Hot Topic</p>
            <p style={statValueStyle}>AI Phones</p>
            <p style={statHintNeutralStyle}>5 videos trending</p>
          </div>
          <div style={statCardStyle}>
            <p style={statLabelStyle}>Gap Opportunity</p>
            <p style={statValueStyle}>Budget Picks</p>
            <p style={statHintGreenStyle}>Low competition</p>
          </div>
        </div>

        <h2 style={sectionHeaderStyle}>Top performing — last 48 hrs</h2>

        {error ? <p style={errorVideosStyle}>{error}</p> : null}

        {loading ? (
          <p style={loadingVideosStyle}>Loading competitor videos...</p>
        ) : (
          <div style={videoListStyle}>
            {videos.map((v) => (
              <div key={v.videoId} style={videoRowStyle}>
                <div style={videoBodyStyle}>
                  <p style={videoTitleStyle}>{v.title}</p>
                  <p style={videoMetaStyle}>{v.channelName}</p>
                </div>
                <span style={tagTrendingStyle}>{v.performanceTag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default MainDashboard
