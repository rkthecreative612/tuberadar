function Sidebar() {
  const rootStyle = {
    width: '220px',
    minWidth: '220px',
    height: '100%',
    minHeight: '100%',
    backgroundColor: '#0a0a0a',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    gap: '20px',
  }

  const logoRowStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  }

  const logoIconStyle = {
    width: '36px',
    height: '36px',
    backgroundColor: '#e53935',
    borderRadius: '6px',
    flexShrink: 0,
  }

  const logoTextBlockStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  }

  const logoTitleStyle = {
    margin: 0,
    fontSize: '17px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
    fontFamily: 'system-ui, sans-serif',
  }

  const logoSubtitleStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    lineHeight: 1.2,
    fontFamily: 'system-ui, sans-serif',
  }

  const sectionLabelStyle = {
    margin: 0,
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#666666',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
  }

  const channelsBlockStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  const channelCardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(30, 80, 160, 0.25)',
    border: '1px solid rgba(60, 120, 200, 0.35)',
    boxSizing: 'border-box',
  }

  const avatarStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(100, 160, 255, 0.35)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
  }

  const channelMetaStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  }

  const channelNameStyle = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1.2,
    fontFamily: 'system-ui, sans-serif',
  }

  const channelSubsStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    lineHeight: 1.2,
    fontFamily: 'system-ui, sans-serif',
  }

  const addChannelStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px dashed #555555',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#888888',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
  }

  const navStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  }

  const navItemBase = {
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  }

  const navActiveStyle = {
    ...navItemBase,
    backgroundColor: '#1f1f1f',
    color: '#ffffff',
    fontWeight: 600,
  }

  const navInactiveStyle = {
    ...navItemBase,
    backgroundColor: 'transparent',
    color: '#888888',
    fontWeight: 500,
  }

  return (
    <aside style={rootStyle} aria-label="TubeRadar sidebar">
      <div style={logoRowStyle}>
        <div style={logoIconStyle} aria-hidden />
        <div style={logoTextBlockStyle}>
          <p style={logoTitleStyle}>TubeRadar</p>
          <p style={logoSubtitleStyle}>Creator Intel</p>
        </div>
      </div>

      <div style={channelsBlockStyle}>
        <p style={sectionLabelStyle}>My channels</p>
        <div style={channelCardStyle}>
          <div style={avatarStyle}>T</div>
          <div style={channelMetaStyle}>
            <p style={channelNameStyle}>TechTalks IN</p>
            <p style={channelSubsStyle}>48.2K subs</p>
          </div>
        </div>
        <button type="button" style={addChannelStyle}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add Channel
        </button>
      </div>

      <nav style={navStyle} aria-label="Main navigation">
        <button type="button" style={navActiveStyle}>
          Competitor Feed
        </button>
        <button type="button" style={navInactiveStyle}>
          Topic Analysis
        </button>
        <button type="button" style={navInactiveStyle}>
          Video Planner
        </button>
        <button type="button" style={navInactiveStyle}>
          Brainstormer
        </button>
      </nav>
    </aside>
  )
}

export default Sidebar
