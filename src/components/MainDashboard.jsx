function MainDashboard() {
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

  const videoEmojiStyle = {
    fontSize: '22px',
    lineHeight: 1,
    flexShrink: 0,
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

  const tagViralStyle = {
    ...tagBaseStyle,
    color: '#ff5252',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
  }

  const tagTrendingStyle = {
    ...tagBaseStyle,
    color: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  }

  const tagSteadyStyle = {
    ...tagBaseStyle,
    color: '#42a5f5',
    backgroundColor: 'rgba(66, 165, 245, 0.12)',
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
        <button type="button" style={refreshButtonStyle}>
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

        <div style={videoListStyle}>
          <div style={videoRowStyle}>
            <span style={videoEmojiStyle} aria-hidden>
              📱
            </span>
            <div style={videoBodyStyle}>
              <p style={videoTitleStyle}>Best AI Phones Under $500 in 2026</p>
              <p style={videoMetaStyle}>PhonePulse · 1.2M views</p>
            </div>
            <span style={tagViralStyle}>🔥 Viral</span>
          </div>
          <div style={videoRowStyle}>
            <span style={videoEmojiStyle} aria-hidden>
              🤖
            </span>
            <div style={videoBodyStyle}>
              <p style={videoTitleStyle}>AI Agents Explained for Creators</p>
              <p style={videoMetaStyle}>TechBrief · 640K views</p>
            </div>
            <span style={tagTrendingStyle}>↑ Trending</span>
          </div>
          <div style={videoRowStyle}>
            <span style={videoEmojiStyle} aria-hidden>
              💻
            </span>
            <div style={videoBodyStyle}>
              <p style={videoTitleStyle}>Laptop Buying Guide: What Actually Matters</p>
              <p style={videoMetaStyle}>GearWatch · 210K views</p>
            </div>
            <span style={tagSteadyStyle}>Steady</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default MainDashboard
