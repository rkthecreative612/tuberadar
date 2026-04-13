import { useState, useEffect } from 'react'
import { searchByChannel, searchByKeywords } from '../lib/youtube'
import supabase from '../lib/supabase'

function MainDashboard({ selectedMyChannel, onBackClick }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    recentCount: 0,
    topCount: 0,
    bestChannel: '—'
  })

  useEffect(() => {
    if (!selectedMyChannel) return
    let isMounted = true

    async function fetchVideos() {
      setLoading(true)
      setError(null)
      try {
        const { data: competitors, error: compError } = await supabase
          .from('competitor_channels')
          .select('*')
          .eq('my_channel_id', selectedMyChannel.id)

        if (compError) throw new Error('Failed to load competitors')

        if (!competitors || competitors.length === 0) {
          if (isMounted) setVideos([])
          return
        }

        const promises = competitors.map(async (comp) => {
          let items = []
          if (comp.channel_url) {
             items = await searchByChannel(comp.channel_url)
          } else if (comp.keywords) {
             items = await searchByKeywords(comp.keywords)
          }

          if (!items) return []

          return items.map(item => {
            const viewCount = item.viewCount ?? 0;
            return {
              compName: comp.name,
              title: item.snippet.title,
              channelName: item.snippet.channelTitle,
              videoId: item.id.videoId,
              thumbnail: `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
              publishedAt: item.snippet.publishedAt,
              viewCount: viewCount,
              likeCount: item.likeCount ?? 0,
            }
          })
        })

        const resultsArray = await Promise.all(promises)
        let allVideos = resultsArray.flat()

        // Sort by views descending
        allVideos.sort((a, b) => b.viewCount - a.viewCount)

        if (!isMounted) return

        setVideos(allVideos)

        // Calculate stats
        const topCount = allVideos.filter(v => v.viewCount > 100000).length;
        let bestChannelName = '—';
        if (allVideos.length > 0) {
          bestChannelName = allVideos[0].compName || allVideos[0].channelName;
        }

        setStats({
          recentCount: allVideos.length,
          topCount: topCount,
          bestChannel: bestChannelName
        });

      } catch (e) {
        console.error(e)
        if (isMounted) {
          setError(e?.message ?? 'Failed to load videos')
          setVideos([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchVideos()

    return () => {
      isMounted = false
    }
  }, [selectedMyChannel])

  const handleDelete = async () => {
    if (!selectedMyChannel) return
    const confirmDelete = window.confirm(`Delete ${selectedMyChannel.name}?`)
    if (!confirmDelete) return

    await supabase.from('my_channels').delete().eq('id', selectedMyChannel.id)
    if (onBackClick) onBackClick()
  }

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
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  }

  const topBarLeftStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '16px'
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
    color: '#fff',
    backgroundColor: '#333',
    border: 'none',
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
    gap: '30px',
  }

  const statCardsContainerStyle = {
    display: 'flex',
    gap: '20px'
  }

  const statCardStyle = {
    flex: 1,
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }

  const statValStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0
  }

  const statLabelStyle = {
    fontSize: '14px',
    color: '#888',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600
  }

  const sectionHeaderStyle = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px'
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  }

  const cardStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
    position: 'relative'
  }

  const thumbnailContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '140px',
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
    padding: '4px 8px',
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

  const compLabelStyle = {
    fontSize: '11px',
    color: '#bbb',
    margin: 0
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

  const formatCompact = (num) => {
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  return (
    <main style={rootStyle}>
      <header style={topBarStyle}>
        <div style={topBarLeftStyle}>
          {onBackClick && (
            <button type="button" style={backButtonStyle} onClick={onBackClick}>
              &larr; Back
            </button>
          )}
          <h1 style={topTitleStyle}>{selectedMyChannel?.name || 'Dashboard'}</h1>
        </div>
        
        <div style={topBarRightStyle}>
          <button type="button" style={actionButtonStyle}>Edit</button>
          <button type="button" style={dangerButtonStyle} onClick={handleDelete}>Delete</button>
        </div>
      </header>

      <div style={scrollAreaStyle}>
        
        <div style={statCardsContainerStyle}>
          <div style={statCardStyle}>
            <p style={statValStyle}>{stats.recentCount}</p>
            <p style={statLabelStyle}>Recent Uploads (48h)</p>
          </div>
          <div style={statCardStyle}>
            <p style={statValStyle}>{stats.topCount}</p>
            <p style={statLabelStyle}>Top Performing (&gt;100k views)</p>
          </div>
          <div style={statCardStyle}>
            <p style={statValStyle} style={{ ...statValStyle, fontSize: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.bestChannel}</p>
            <p style={statLabelStyle}>Best Category Channel</p>
          </div>
        </div>

        <div>
          <h2 style={sectionHeaderStyle}>Competitor Videos</h2>

          {error && <p style={{ color: '#ff5252' }}>{error}</p>}

          <div style={gridStyle}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-${i}`} style={skeletonCardStyle}>
                  <div style={thumbnailContainerStyle}>
                    <div style={{ ...thumbnailStyle, backgroundColor: '#2a2a2a' }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: '80%', height: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}></div>
                    <div style={{ width: '60%', height: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}></div>
                  </div>
                  <button style={{ ...brainstormButtonStyle, backgroundColor: '#2a2a2a', color: '#888', borderColor: 'transparent', cursor: 'default' }}>Loading...</button>
                </div>
              ))
            ) : videos.length === 0 ? (
              <p style={{ color: '#888' }}>No videos found.</p>
            ) : (
              videos.map((v, idx) => {
                const score = calcScore(v);
                const scoreColor = getScoreColor(score);
                return (
                  <div key={`${v.videoId}-${idx}`} style={cardStyle}>
                    <div style={thumbnailContainerStyle}>
                      <img src={v.thumbnail} alt={v.title} style={thumbnailStyle} />
                      <span style={timePillStyle}>{timeAgo(v.publishedAt)}</span>
                    </div>
                    <p style={compLabelStyle}>{v.compName || v.channelName} • {formatCompact(v.viewCount)} views</p>
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
      </div>
    </main>
  )
}

export default MainDashboard
