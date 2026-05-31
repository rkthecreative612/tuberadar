import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const RED = '#e50914'
const RED_GLOW = 'rgba(229, 9, 20, 0.45)'

const pageStyle = {
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
  background: `
    radial-gradient(ellipse 80% 60% at 20% 30%, rgba(229, 9, 20, 0.25) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 80% 70%, rgba(120, 0, 0, 0.35) 0%, transparent 50%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(60, 0, 0, 0.2) 0%, transparent 60%),
    #000000
  `,
}

const cardStyle = {
  display: 'flex',
  width: '100%',
  maxWidth: '980px',
  minHeight: '560px',
  borderRadius: '16px',
  border: `1px solid ${RED}`,
  boxShadow: `0 0 40px ${RED_GLOW}, 0 0 80px rgba(229, 9, 20, 0.15)`,
  overflow: 'hidden',
  background: 'rgba(8, 8, 8, 0.92)',
}

const leftPanelStyle = {
  flex: '1 1 50%',
  padding: '48px 40px 36px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRight: '1px solid rgba(229, 9, 20, 0.25)',
}

const rightPanelStyle = {
  flex: '1 1 50%',
  padding: '48px 40px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'rgba(12, 12, 12, 0.75)',
  backdropFilter: 'blur(12px)',
}

const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(20, 20, 20, 0.9)',
  border: '1px solid #333',
  borderRadius: '10px',
  padding: '0 14px',
  marginBottom: '16px',
  transition: 'border-color 0.2s',
}

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#fff',
  fontSize: '14px',
  padding: '14px 0',
  fontFamily: 'inherit',
}

const btnPrimaryStyle = {
  width: '100%',
  padding: '14px 20px',
  marginTop: '8px',
  background: RED,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  transition: 'background 0.2s, transform 0.15s',
}

const socialBtnStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 8px',
  background: 'rgba(20, 20, 20, 0.9)',
  border: '1px solid #333',
  borderRadius: '10px',
  color: '#ccc',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'border-color 0.2s, background 0.2s',
}

function LogoMark() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
      <defs>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        filter="url(#logoGlow)"
        style={{ filter: `drop-shadow(0 0 12px ${RED})` }}
      />
      <text
        x="38"
        y="78"
        fill="#fff"
        fontSize="52"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        T
      </text>
      <text
        x="58"
        y="78"
        fill={RED}
        fontSize="52"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        R
      </text>
      <polygon points="72,48 72,62 84,55" fill="#fff" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconEye({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function FeatureItem({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 0, padding: '0 8px' }}>
      <div
        style={{
          width: '44px',
          height: '44px',
          margin: '0 auto 10px',
          borderRadius: '10px',
          background: 'rgba(229, 9, 20, 0.15)',
          border: `1px solid rgba(229, 9, 20, 0.4)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{title}</div>
      <div style={{ color: '#888', fontSize: '11px', lineHeight: 1.4 }}>{desc}</div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError
      navigate('/Landing')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setError('')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/home` },
    })
    if (authError) setError(authError.message)
  }

  return (
    <div style={pageStyle}>
      <div className="login-card" style={cardStyle}>
        {/* Left — branding */}
        <div className="login-left" style={leftPanelStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LogoMark />
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                TUBE
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '6px',
                  justifyContent: 'center',
                }}
              >
                <span style={{ height: '2px', width: '32px', background: RED }} />
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    color: RED,
                  }}
                >
                  RADAR
                </span>
                <span style={{ height: '2px', width: '32px', background: RED }} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '100%',
              gap: '8px',
              marginTop: '32px',
            }}
          >
            <FeatureItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill={RED}>
                  <polygon points="8,5 19,12 8,19" />
                </svg>
              }
              title="Fast Streaming"
              desc="Ultra fast and smooth experience"
            />
            <FeatureItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              title="Secure & Safe"
              desc="Your data is always protected"
            />
            <FeatureItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              title="User Friendly"
              desc="Simple, clean and easy to use"
            />
          </div>

          <p style={{ margin: '28px 0 0', color: '#888', fontSize: '14px', textAlign: 'center' }}>
            Stream. Watch. <span style={{ color: RED, fontWeight: 600 }}>Enjoy.</span>
          </p>
        </div>

        {/* Right — form */}
        <div style={rightPanelStyle}>
          <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 800, color: '#fff' }}>
            Welcome Back!
          </h1>
          <p style={{ margin: '0 0 28px', color: '#888', fontSize: '14px' }}>
            Login to continue to <span style={{ color: RED, fontWeight: 600 }}>TubeRadar</span>
          </p>

          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(229, 9, 20, 0.12)',
                border: '1px solid rgba(229, 9, 20, 0.35)',
                color: '#ff6b6b',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div
              style={inputWrapStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = RED }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#333' }}
            >
              <IconUser />
              <input
                type="email"
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
                autoComplete="email"
              />
            </div>

            <div
              style={inputWrapStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = RED }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#333' }}
            >
              <IconLock />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconEye open={showPassword} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#888',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: RED }}
                />
                Remember Me
              </label>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: RED,
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                }}
                onClick={() => {
                  if (email.trim()) {
                    supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo: `${window.location.origin}/login`,
                    })
                    setError('')
                    alert('Check your email for a password reset link.')
                  } else {
                    setError('Enter your email above to reset your password.')
                  }
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...btnPrimaryStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#ff1a1a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = RED }}
            >
              {loading ? 'Logging in…' : 'Login'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '24px 0',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: '#333' }} />
            <span style={{ color: '#666', fontSize: '12px', fontWeight: 600 }}>OR</span>
            <span style={{ flex: 1, height: '1px', background: '#333' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              style={socialBtnStyle}
              onClick={() => handleOAuth('google')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              style={socialBtnStyle}
              onClick={() => handleOAuth('github')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              style={socialBtnStyle}
              onClick={() => handleOAuth('google')}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </button>
          </div>

          <p style={{ marginTop: '28px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Don&apos;t have an account?{' '}
            <Link to="/login" style={{ color: RED, fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .login-card { flex-direction: column !important; min-height: auto !important; }
          .login-left { border-right: none !important; border-bottom: 1px solid rgba(229, 9, 20, 0.25); padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  )
}
