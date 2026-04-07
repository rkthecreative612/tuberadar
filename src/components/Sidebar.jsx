import { useEffect, useRef, useState } from 'react'
import supabase from '../lib/supabase'

function Sidebar({ onChannelSelect } = {}) {
  const [showInput, setShowInput] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [addMode, setAddMode] = useState('keywords') // 'keywords' | 'url'
  const [contentType, setContentType] = useState('videos') // 'videos' | 'shorts'
  const [formMode, setFormMode] = useState(null) // 'add' | 'edit' | null
  const [editOriginalName, setEditOriginalName] = useState('')
  const [channels, setChannels] = useState([
    {
      name: 'TechTalks IN',
      subscribers: '48.2K subs',
      avatar: 'T',
      keywords: 'tech review india 2026',
      contentType: 'videos',
    },
  ])
  const [activeChannelName, setActiveChannelName] = useState('TechTalks IN')
  const [hoveredChannelName, setHoveredChannelName] = useState(null)
  const [openMenuFor, setOpenMenuFor] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!openMenuFor) return

    const onDocMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuFor(null)
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [openMenuFor])

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
    position: 'relative',
  }

  const channelActiveStyle = {
    ...channelCardStyle,
    backgroundColor: 'rgba(60, 140, 255, 0.22)',
    border: '1px solid rgba(120, 190, 255, 0.7)',
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

  const channelMoreButtonStyle = {
    marginLeft: 'auto',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #2a2a2a',
    backgroundColor: '#0f0f0f',
    color: '#bbbbbb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    lineHeight: 1,
    padding: 0,
    opacity: 0,
    transition: 'opacity 120ms ease',
  }

  const channelMoreButtonVisibleStyle = {
    ...channelMoreButtonStyle,
    opacity: 1,
  }

  const dropdownStyle = {
    position: 'absolute',
    top: '42px',
    right: '8px',
    backgroundColor: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '6px',
    minWidth: '120px',
    zIndex: 10,
    boxSizing: 'border-box',
  }

  const dropdownItemStyle = {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#e0e0e0',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
  }

  const dropdownItemDangerStyle = {
    ...dropdownItemStyle,
    color: '#ff7777',
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

  const addChannelFormStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '2px',
  }

  const channelInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: '#141414',
    border: '1px solid #444444',
    borderRadius: '6px',
    outline: 'none',
  }

  const inputLabelStyle = {
    margin: 0,
    fontSize: '11px',
    color: '#888888',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.2,
    fontWeight: 500,
  }

  const modeToggleRowStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '2px',
  }

  const modeToggleBaseStyle = {
    flex: 1,
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid #2a2a2a',
    backgroundColor: '#0f0f0f',
    color: '#bbbbbb',
  }

  const modeToggleActiveStyle = {
    ...modeToggleBaseStyle,
    backgroundColor: '#1f1f1f',
    color: '#ffffff',
    border: '1px solid #444444',
  }

  const contentToggleRowStyle = {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  }

  const contentTogglePillBaseStyle = {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '999px',
    cursor: 'pointer',
    border: '1px solid #444444',
    backgroundColor: 'transparent',
    color: '#888888',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'system-ui, sans-serif',
  }

  const contentTogglePillSelectedStyle = {
    ...contentTogglePillBaseStyle,
    backgroundColor: '#ffffff',
    color: '#0a0a0a',
    border: '1px solid #ffffff',
  }

  const saveChannelStyle = {
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: '#1f1f1f',
    border: '1px solid #444444',
    borderRadius: '6px',
    cursor: 'pointer',
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

  const extractHandleFromUrl = (url) => {
    const s = String(url ?? '').trim()
    if (!s) return ''

    const atMatch = s.match(/@([a-zA-Z0-9._-]+)/)
    if (atMatch?.[1]) return `@${atMatch[1]}`

    return ''
  }

  const handleAddChannelClick = () => {
    setChannelName('')
    setKeywords('')
    setChannelUrl('')
    setAddMode('keywords')
    setContentType('videos')
    setShowInput(true)
    setFormMode('add')
    setEditOriginalName('')
  }

  const handleSubmitChannel = async () => {
    const trimmed = channelName.trim()
    const trimmedKeywords = keywords.trim()
    const trimmedUrl = channelUrl.trim()
    const extractedHandle = addMode === 'url' ? extractHandleFromUrl(trimmedUrl) : ''

    const channelIdToSave = addMode === 'url' ? extractedHandle : trimmedKeywords
    if (!trimmed || !channelIdToSave) return

    // For now, we store Topic Keywords in the `channel_id` column.
    const isEditing = formMode === 'edit'
    const query = isEditing
      ? supabase
          .from('channels')
          .update({ name: trimmed, channel_id: channelIdToSave })
          .eq('name', editOriginalName)
      : supabase.from('channels').insert({
          name: trimmed,
          channel_id: channelIdToSave,
        })

    const { error } = await query

    if (error) {
      console.error(error)
      return
    }

    const letter = trimmed.charAt(0).toUpperCase() || '?'
    setChannels((prev) => {
      if (isEditing) {
        return prev.map((c) =>
          c.name === editOriginalName
            ? {
                ...c,
                name: trimmed,
                avatar: letter,
                keywords: channelIdToSave,
                contentType,
              }
            : c,
        )
      }

      return [
        ...prev,
        {
          name: trimmed,
          subscribers: '—',
          avatar: letter,
          keywords: channelIdToSave,
          contentType,
        },
      ]
    })

    setActiveChannelName((prev) => (prev === editOriginalName ? trimmed : prev))
    if (typeof onChannelSelect === 'function') {
      onChannelSelect(trimmed, channelIdToSave, contentType)
    }
    setChannelName('')
    setKeywords('')
    setChannelUrl('')
    setShowInput(false)
    setFormMode(null)
    setEditOriginalName('')
  }

  const handleEditChannel = (ch) => {
    setFormMode('edit')
    setEditOriginalName(ch.name)
    setChannelName(ch.name)
    setKeywords(ch.keywords ?? '')
    setChannelUrl('')
    setAddMode('keywords')
    setContentType(ch.contentType ?? 'videos')
    setShowInput(true)
    setOpenMenuFor(null)
  }

  const handleRemoveChannel = async (ch) => {
    setOpenMenuFor(null)
    const { error } = await supabase.from('channels').delete().eq('name', ch.name)
    if (error) {
      console.error(error)
      return
    }

    setChannels((prev) => prev.filter((c) => c.name !== ch.name))

    if (activeChannelName === ch.name) {
      const next = channels.find((c) => c.name !== ch.name) ?? null
      const nextName = next?.name ?? ''
      const nextKeywords = next?.keywords ?? ''
      setActiveChannelName(nextName)
      if (typeof onChannelSelect === 'function') {
        onChannelSelect(nextName, nextKeywords)
      }
    }
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
        {channels.map((ch, i) => (
          <div
            key={`${ch.name}-${i}`}
            style={ch.name === activeChannelName ? channelActiveStyle : channelCardStyle}
            role="button"
            tabIndex={0}
            onMouseEnter={() => setHoveredChannelName(ch.name)}
            onMouseLeave={() => setHoveredChannelName((prev) => (prev === ch.name ? null : prev))}
            onClick={() => {
              setActiveChannelName(ch.name)
              if (typeof onChannelSelect === 'function') {
                onChannelSelect(ch.name, ch.keywords ?? '', ch.contentType ?? 'videos')
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveChannelName(ch.name)
                if (typeof onChannelSelect === 'function') {
                  onChannelSelect(ch.name, ch.keywords ?? '', ch.contentType ?? 'videos')
                }
              }
            }}
          >
            <div style={avatarStyle}>{ch.avatar}</div>
            <div style={channelMetaStyle}>
              <p style={channelNameStyle}>{ch.name}</p>
              <p style={channelSubsStyle}>{ch.subscribers}</p>
            </div>

            <button
              type="button"
              aria-label="Channel actions"
              style={
                hoveredChannelName === ch.name || openMenuFor === ch.name
                  ? channelMoreButtonVisibleStyle
                  : channelMoreButtonStyle
              }
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuFor((prev) => (prev === ch.name ? null : ch.name))
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ⋯
            </button>

            {openMenuFor === ch.name ? (
              <div
                ref={menuRef}
                style={dropdownStyle}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button type="button" style={dropdownItemStyle} onClick={() => handleEditChannel(ch)}>
                  Edit
                </button>
                <button
                  type="button"
                  style={dropdownItemDangerStyle}
                  onClick={() => void handleRemoveChannel(ch)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        ))}
        <button type="button" style={addChannelStyle} onClick={handleAddChannelClick}>
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
        {showInput ? (
          <div style={addChannelFormStyle}>
            <div style={modeToggleRowStyle}>
              <button
                type="button"
                style={addMode === 'keywords' ? modeToggleActiveStyle : modeToggleBaseStyle}
                onClick={() => setAddMode('keywords')}
              >
                By Keywords
              </button>
              <button
                type="button"
                style={addMode === 'url' ? modeToggleActiveStyle : modeToggleBaseStyle}
                onClick={() => setAddMode('url')}
              >
                By Channel URL
              </button>
            </div>
            <p style={inputLabelStyle}>Channel Name</p>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name"
              style={channelInputStyle}
              aria-label="Channel name"
            />
            {addMode === 'keywords' ? (
              <>
                <p style={inputLabelStyle}>Topic Keywords</p>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Topic Keywords (e.g. tech review india budget phones)"
                  style={channelInputStyle}
                  aria-label="Topic keywords"
                />
              </>
            ) : (
              <>
                <p style={inputLabelStyle}>YouTube Channel URL</p>
                <input
                  type="text"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@channelname"
                  style={channelInputStyle}
                  aria-label="YouTube channel URL"
                />
              </>
            )}
            <button type="button" style={saveChannelStyle} onClick={handleSubmitChannel}>
              {formMode === 'edit' ? 'Update' : 'Save'}
            </button>

            <div style={contentToggleRowStyle} role="radiogroup" aria-label="Content type">
              <button
                type="button"
                style={contentType === 'videos' ? contentTogglePillSelectedStyle : contentTogglePillBaseStyle}
                onClick={() => setContentType('videos')}
                aria-pressed={contentType === 'videos'}
              >
                Videos
              </button>
              <button
                type="button"
                style={contentType === 'shorts' ? contentTogglePillSelectedStyle : contentTogglePillBaseStyle}
                onClick={() => setContentType('shorts')}
                aria-pressed={contentType === 'shorts'}
              >
                Shorts
              </button>
            </div>
          </div>
        ) : null}
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
