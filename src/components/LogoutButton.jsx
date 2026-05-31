/* eslint-disable react/prop-types */
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const LogoutIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

function LogoutButton({ variant = 'sidebar' }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#fff',
    background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.22) 0%, rgba(80, 0, 0, 0.35) 100%)',
    border: '1px solid rgba(229, 9, 20, 0.45)',
    boxShadow: '0 4px 20px rgba(229, 9, 20, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
  }

  const variantStyle =
    variant === 'floating'
      ? {
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 10,
          padding: '11px 20px',
          borderRadius: '12px',
          fontSize: '11px',
        }
      : {
          width: '100%',
          marginTop: 'auto',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '12px',
        }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{ ...baseStyle, ...variantStyle }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(229, 9, 20, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.7)'
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(229, 9, 20, 0.35) 0%, rgba(120, 0, 0, 0.45) 100%)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(229, 9, 20, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.45)'
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(229, 9, 20, 0.22) 0%, rgba(80, 0, 0, 0.35) 100%)'
      }}
    >
      <LogoutIcon size={variant === 'floating' ? 15 : 14} />
      <span>Sign Out</span>
    </button>
  )
}

export default LogoutButton
