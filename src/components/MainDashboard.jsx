import { useState, useEffect } from 'react'
import { searchByChannel, searchByKeywords } from '../lib/youtube'
import supabase from '../lib/supabase'

function MainDashboard({
  searchTopic = 'madan gowri',
  channelName = 'TechTalks IN',
  contentType = 'videos',
  isChannelUrl = false,
  selectedChannel = null,
  onBackClick = null,
}) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchVideos() {
    console.log('Fetching videos for topic:', searchTopic);
    setLoading(true)
    setError(null)
    try {
      const topicToSearch = searchTopic;
      console.log('Using topicToSearch:', topicToSearch);

      const items = isChannelUrl
        ? await searchByChannel(topicToSearch, contentType)
        : await searchByKeywords(topicToSearch, contentType)
        
      const mapped = items.map((item) => ({
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        videoId: item.id.videoId,
        thumbnail: `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.viewCount ?? 0,
        likeCount: item.likeCount ?? 0,
        views: item.viewCount ?? 0,
      }))

      if (mapped.length > 0) {
        const rows = mapped.map((v) => ({
          title: v.title,
          channel_name: v.channelName,
          video_id: v.videoId,
          thumbnail: v.thumbnail,
          published_at: v.publishedAt,
          views: v.views,
        }))
        const { error: insertError } = await supabase
          .from('competitor_videos')
          .insert(rows)
        if (insertError) {
          console.error(insertError)
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
    if (searchTopic) {
      fetchVideos();
    }
  }, [searchTopic]);

  useEffect(() => {
    fetchVideos();
  }, []);

  const timeAgo = (dateString) => {
    const d = new Date(dateString)
    const ms = Date.now() - d.getTime()
    if (!Number.isFinite(ms)) return '—'
    const mins = Math.floor(ms / (60 * 1000))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hrs ago`
    const days = Math.floor(hrs / 24)
    return `${days} days ago`
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

  const getScoreColor = (score) => {
    if (score >= 70) return '#4caf50' // green
    if (score >= 40) return '#ff9800' // orange
    return '#ff5252' // red
  }

  const rootStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    backgroundColor: '#0f0f0f',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  }

  const topBarStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: '16px 24px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  }

  const topTitleStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  }

  const topBarLeftStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
  }

  const topBarRightStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  }

  const actionButtonStyle = {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
  }

  const dangerButtonStyle = {
    ...actionButtonStyle,
    color: '#ff5252',
    borderColor: '#ff5252',
    backgroundColor: 'transparent',
  }

  const backButtonStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#ccc',
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  }

  const scrollAreaStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }

  const sectionHeaderStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px'
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  }

  const cardStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
    position: 'relative'
  }

  const thumbnailContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '160px',
  }

  const thumbnailStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '8px',
  }

  const timePillStyle = {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
  }

  const videoTitleStyle = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }

  const brainstormButtonStyle = {
    marginTop: 'auto',
    padding: '8px',
    width: '100%',
    backgroundColor: '#1f1f1f',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'center'
  }

  const skeletonCardStyle = {
    ...cardStyle,
    backgroundColor: '#1a1a1a',
  }

  return (
    <main style={rootStyle}>
      <header style={topBarStyle}>
        <div style={topBarLeftStyle}>
          {onBackClick && (
            <button type="button" style={backButtonStyle} onClick={onBackClick}>
              &larr; Back
            </button>
          )}
        </div>
        <h1 style={topTitleStyle}>{channelName}</h1>
        <div style={topBarRightStyle}>
          <button type="button" style={actionButtonStyle}>Edit</button>
          <button type="button" style={dangerButtonStyle}>Delete</button>
        </div>
      </header>

      <div style={scrollAreaStyle}>
        <h2 style={sectionHeaderStyle}>Recent uploads</h2>

        {error && <p style={{ color: '#ff5252' }}>{error}</p>}

        <div style={gridStyle}>
          {loading || videos.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} style={skeletonCardStyle}>
                <div style={thumbnailContainerStyle}>
                  <div style={{ ...thumbnailStyle, backgroundColor: '#2a2a2a' }}></div>
                  <span style={{ ...timePillStyle, backgroundColor: '#2a2a2a', color: '#888' }}>&mdash; hrs ago</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '80%', height: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}></div>
                  <div style={{ width: '60%', height: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}></div>
                </div>
                <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#888', backgroundColor: '#2a2a2a', display: 'inline-block' }}>Score: &mdash;%</span>
                </div>
                <button style={{ ...brainstormButtonStyle, backgroundColor: '#2a2a2a', color: '#888', borderColor: 'transparent', cursor: 'default' }}>Move to Brainstorm</button>
              </div>
            ))
          ) : (
            videos.map((v) => {
              const score = calcScore(v);
              const scoreColor = getScoreColor(score);
              return (
                <div key={v.videoId} style={cardStyle}>
                  <div style={thumbnailContainerStyle}>
                    <img src={v.thumbnail} alt={v.title} style={thumbnailStyle} />
                    <span style={timePillStyle}>{timeAgo(v.publishedAt)}</span>
                  </div>
                  <p style={videoTitleStyle}>{v.title}</p>
                  
                  <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: scoreColor,
                      backgroundColor: `${scoreColor}20`,
                      display: 'inline-block'
                    }}>
                      Score: {score}%
                    </span>
                  </div>

                  <button 
                    style={brainstormButtonStyle}
                    onClick={() => console.log('Move to Brainstorm clicked:', v.title)}
                  >
                    Move to Brainstorm
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  )
}

export default MainDashboard
