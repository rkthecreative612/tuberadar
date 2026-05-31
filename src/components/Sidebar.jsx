/* eslint-disable react/prop-types */
import { NavLink } from 'react-router-dom'
import LogoutButton from './LogoutButton'

function Sidebar() {
  const rootStyle = {
    width: '240px',
    minWidth: '240px',
    height: '100vh',
    backgroundColor: '#0f0f0f',
    borderRight: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px 14px',
    boxSizing: 'border-box',
  }

  const brandRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px 14px 8px',
    boxSizing: 'border-box',
  }

  const brandIconStyle = {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
  }

  const brandTextStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: '#ffffff',
    lineHeight: 1.1,
    fontFamily: 'system-ui, sans-serif',
  }

  const dividerStyle = {
    height: '1px',
    backgroundColor: '#1f1f1f',
    margin: '4px 8px 14px 8px',
  }

  const navStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '0 6px',
    flex: 1,
  }

  const linkBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 650,
    color: '#9a9a9a',
    border: '1px solid transparent',
    transition: 'background 120ms ease, color 120ms ease, border 120ms ease',
    fontFamily: 'system-ui, sans-serif',
  }

  const linkActiveStyle = {
    backgroundColor: 'rgba(225, 6, 0, 0.12)',
    border: '1px solid rgba(225, 6, 0, 0.35)',
    color: '#ffffff',
  }

  const dotStyle = (active) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: active ? '#e10600' : '#3a3a3a',
    flexShrink: 0,
  })

  const Item = ({ to, label, end = false }) => (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...linkBaseStyle,
        ...(isActive ? linkActiveStyle : null),
      })}
    >
      {({ isActive }) => (
        <>
          <span style={dotStyle(isActive)} aria-hidden />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )

  return (
    <aside style={rootStyle} aria-label="Sidebar">
      <div style={brandRowStyle}>
        <img src="/tuberadorlogo.png" alt="TubeRadar logo" style={brandIconStyle} />
        <h1 style={brandTextStyle}>TubeRadar</h1>
      </div>
      <div style={dividerStyle} />

      <nav style={navStyle} aria-label="Navigation">
        <Item to="/landing" label="Home" />
        <Item to="/planner" label="Board" />
        <Item to="/scheduler" label="Tasks" />
        <Item to="/status" label="Status" />
        <Item to="/home" label="Channels" end />
        <Item to="/brainstorm" label="Brainstorm" />
        <Item to="/smart-search" label="Smart Search" />
        <Item to="/completed-videos" label="Published" />
        <Item to="/deleted-videos" label="Trash" />
        <Item to="/revenue" label="Monetization" />
      </nav>

      <LogoutButton variant="sidebar" />
    </aside>
  )
}

export default Sidebar
