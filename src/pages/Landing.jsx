import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const COLORS = {
  bgMain: '#0f0f0f',
  bgCard: '#1a1a1a',
  border: '#333',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#999999',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  orange: '#f59e0b',
  grey: '#6b7280',
}

const TOPIC_COLORS = ['#ef4444', '#22c55e', '#3b82f6']

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const timeAgo = (dateString) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  const now = new Date()

  // Normalize to midnight for day comparison
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((nMid - dMid) / (1000 * 60 * 60 * 24))

  let relative = ''
  if (diffDays === 0) relative = 'Today'
  else if (diffDays === 1) relative = 'Yesterday'
  else relative = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return `${months[d.getMonth()]} ${d.getDate()} (${relative})`
}

const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = parseInt(value) || 0
    if (end === 0) {
      setDisplayValue(0)
      return
    }

    const duration = 800
    const frameDuration = 1000 / 60
    const totalFrames = Math.round(duration / frameDuration)
    const increment = end / totalFrames

    let frame = 0
    const timer = setInterval(() => {
      frame++
      if (frame >= totalFrames) {
        setDisplayValue(end)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(increment * frame))
      }
    }, frameDuration)

    return () => clearInterval(timer)
  }, [value])

  return <span>{displayValue}{suffix}</span>
}

const TrendIndicator = ({ current, previous, label = "last month" }) => {
  const diff = current - previous
  if (diff === 0) return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
      padding: '4px 8px', borderRadius: '12px', 
      backgroundColor: 'rgba(107, 114, 128, 0.1)', 
      color: '#9ca3af', fontSize: '10px', marginLeft: '12px', 
      border: '1px solid rgba(107, 114, 128, 0.2)',
      fontWeight: '700', letterSpacing: '0.05em',
      transform: 'translateY(-3px)'
    }}>
      <span style={{ marginRight: '4px', fontSize: '11px' }}>—</span> SAME AS {label.toUpperCase()}
    </span>
  )
  
  const isUp = diff > 0
  const color = isUp ? '#22c55e' : '#ef4444'
  const bgColor = isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
  const borderColor = isUp ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'

  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 8px', borderRadius: '12px',
      backgroundColor: bgColor, border: `1px solid ${borderColor}`,
      color: color, fontSize: '10px', marginLeft: '12px', 
      fontWeight: '700', whiteSpace: 'nowrap', letterSpacing: '0.05em',
      boxShadow: `0 2px 10px ${bgColor}`,
      textTransform: 'uppercase',
      transform: 'translateY(-3px)'
    }}>
      <span style={{ fontSize: '12px', marginRight: '4px' }}>
        {isUp ? '↑' : '↓'}
      </span>
      {Math.abs(diff)} {label}
    </span>
  )
}

const getCountdown = (dateString) => {
  if (!dateString) return 0
  const d = new Date(dateString)
  const now = new Date()
  const diff = d - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const Landing = () => {
  const navigate = useNavigate()
  const [videosData, setVideosData] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quote, setQuote] = useState({ text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' })
  const [selectedInsightsPeriod, setSelectedInsightsPeriod] = useState('month') // 'week', 'month', '3months'
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelingVideoId, setCancelingVideoId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toast, setToast] = useState(null)
  const [isDoneAnimating, setIsDoneAnimating] = useState(null)
  const [isCancelAnimating, setIsCancelAnimating] = useState(false)

  const textareaRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchQuote = async () => {
    const today = new Date().toDateString()
    const cached = localStorage.getItem('dailyQuote')
    const cachedDate = localStorage.getItem('quoteDate')

    if (cached && cachedDate === today) {
      setQuote(JSON.parse(cached))
      return
    }

    localStorage.removeItem('dailyQuote')
    localStorage.removeItem('quoteDate')

    try {
      const res = await fetch('https://api.allorigins.win/raw?url=https://zenquotes.io/api/random')
      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      const newQuote = { text: data[0].q, author: data[0].a }

      setQuote(newQuote)
      localStorage.setItem('dailyQuote', JSON.stringify(newQuote))
      localStorage.setItem('quoteDate', today)
    } catch (err) {
      console.error('Quote fetch failed:', err)
    }
  }

  // Auto-refresh quote at midnight (checks every minute)
  useEffect(() => {
    fetchQuote()
    const interval = setInterval(fetchQuote, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: vData, error: vErr } = await supabase
          .from('planner_videos')
          .select('*')
          .eq('is_deleted', false)
          .eq('status', 'scheduled')

        if (vErr) throw vErr

        // Normalize created_at for consistent date parsing
        const normalizedVideos = (vData || []).map(video => ({
          ...video,
          created_at: video.created_at && !video.created_at.includes('Z')
            ? `${video.created_at}Z`
            : video.created_at
        }));

        const { data: cData, error: cErr } = await supabase
          .from('my_channels')
          .select('id, name')

        if (cErr) throw cErr

        setVideosData(normalizedVideos)
        setChannels(cData || [])
      } catch (err) {
        console.error('Data fetch failed:', err)
        setError(err.message)
        showToast('Error fetching data: ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const topicColorMap = useMemo(() => {
    const map = {}
    channels.forEach((c, i) => {
      map[c.id] = TOPIC_COLORS[i % TOPIC_COLORS.length]
    })
    return map
  }, [channels])

  // SECTION 2 DATA: Dynamic Overview
  const overviewData = useMemo(() => {
    const today = new Date()

    // Month range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const monthStartStr = startOfMonth.toLocaleDateString('en-CA')
    const monthEndStr = endOfMonth.toLocaleDateString('en-CA')

    // Week range (Monday to Sunday)
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(diff)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    const weekStartStr = startOfWeek.toLocaleDateString('en-CA')
    const weekEndStr = endOfWeek.toLocaleDateString('en-CA')

    const getStats = (startStr, endStr) => {
      const filtered = videosData.filter(v => {
        if (!v.created_at) return false
        // Get local YYYY-MM-DD to match Scheduler
        const d = new Date(v.created_at)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        return dateStr >= startStr && dateStr <= endStr
      })
      const planned = filtered.length
      const completed = filtered.filter(v => v.is_completed).length
      const rate = planned > 0 ? Math.round((completed / planned) * 100) : 0
      return { planned, completed, rate }
    }

    return {
      week: getStats(weekStartStr, weekEndStr),
      month: getStats(monthStartStr, monthEndStr),
      monthName: today.toLocaleString('default', { month: 'long' }).toUpperCase(),
      year: today.getFullYear()
    }
  }, [videosData])

  const prevMonthStats = useMemo(() => {
    const today = new Date()
    const firstOfCurrent = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastOfPrev = new Date(firstOfCurrent)
    lastOfPrev.setDate(0)
    const firstOfPrev = new Date(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1)

    const startStr = firstOfPrev.toLocaleDateString('en-CA')
    const endStr = lastOfPrev.toLocaleDateString('en-CA')

    const filtered = videosData.filter(v => {
      if (!v.created_at) return false
      const d = new Date(v.created_at)
      const dateStr = d.toLocaleDateString('en-CA')
      return dateStr >= startStr && dateStr <= endStr
    })

    return {
      planned: filtered.length,
      completed: filtered.filter(v => v.is_completed).length
    }
  }, [videosData])

  // SECTION 3 DATA
  const overdueVideos = useMemo(() => {
    const now = new Date()
    return videosData
      .filter(v => {
        if (!v.created_at) return false
        const d = new Date(v.created_at)
        return d < now && !v.is_completed && !v.cancellation_reason
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [videosData])

  // SECTION 4 DATA
  const upcomingVideos = useMemo(() => {
    const now = new Date()
    return videosData
      .filter(v => {
        if (!v.created_at) return false
        const d = new Date(v.created_at)
        return d > now && !v.is_completed
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 3)
  }, [videosData])

  // SECTION 5 DATA
  const insightsData = useMemo(() => {
    const today = new Date()
    let start, end

    if (selectedInsightsPeriod === 'week') {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const sw = new Date(today)
      sw.setDate(diff)
      const ew = new Date(sw)
      ew.setDate(sw.getDate() + 6)
      start = sw.toLocaleDateString('en-CA')
      end = ew.toLocaleDateString('en-CA')
    } else if (selectedInsightsPeriod === 'month') {
      const sm = new Date(today.getFullYear(), today.getMonth(), 1)
      const em = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      start = sm.toLocaleDateString('en-CA')
      end = em.toLocaleDateString('en-CA')
    } else {
      const t3 = new Date(today)
      t3.setDate(t3.getDate() - 90)
      start = t3.toLocaleDateString('en-CA')
      end = today.toLocaleDateString('en-CA')
    }

    // Previous month for comparison
    const fCurrent = new Date(today.getFullYear(), today.getMonth(), 1)
    const lPrev = new Date(fCurrent)
    lPrev.setDate(0)
    const fPrev = new Date(lPrev.getFullYear(), lPrev.getMonth(), 1)
    const pStart = fPrev.toLocaleDateString('en-CA')
    const pEnd = lPrev.toLocaleDateString('en-CA')

    const stats = channels.map(channel => {
      const getTopicStats = (s, e) => {
        const filtered = videosData.filter(v => {
          if (v.topic_id !== channel.id || !v.created_at) return false
          const dStr = new Date(v.created_at).toLocaleDateString('en-CA')
          return dStr >= s && dStr <= e
        })
        return {
          uploads: filtered.filter(v => v.is_completed).length,
          planned: filtered.filter(v => !v.is_completed).length
        }
      }

      const current = getTopicStats(start, end)
      const prev = getTopicStats(pStart, pEnd)

      return {
        id: channel.id,
        name: channel.name,
        uploads: current.uploads,
        planned: current.planned,
        prevTotal: prev.uploads + prev.planned,
        currentTotal: current.uploads + current.planned
      }
    })

    const topTopic = [...stats].sort((a, b) => b.uploads - a.uploads)[0]?.name || 'N/A'
    return { stats, topTopic }
  }, [videosData, channels, selectedInsightsPeriod])

  const handleMarkDone = async (videoId) => {
    setIsDoneAnimating(videoId)
    const completedAt = new Date().toISOString()
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('planner_videos')
          .update({ is_completed: true, completed_at: completedAt })
          .eq('id', videoId)

        if (error) throw error

        setVideosData(prev => prev.map(v => v.id === videoId ? { ...v, is_completed: true, completed_at: completedAt } : v))
        showToast('✅ Video marked complete')
      } catch (err) {
        showToast('Failed to update: ' + err.message, 'error')
      } finally {
        setIsDoneAnimating(null)
      }
    }, 300)
  }

  const handleReschedule = async (videoId) => {
    try {
      const { error } = await supabase
        .from('planner_videos')
        .update({ status: 'planning', updated_at: new Date().toISOString() })
        .eq('id', videoId)

      if (error) throw error

      setVideosData(prev => prev.filter(v => v.id !== videoId))
      showToast('✅ Video moved back to Planner')
    } catch (err) {
      showToast('Failed to reschedule: ' + err.message, 'error')
    }
  }

  const handleCancelSubmit = async () => {
    const reason = cancelReason.substring(0, 200)
    setIsCancelAnimating(true)
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('planner_videos')
          .update({
            cancellation_reason: reason,
            is_completed: true,
            is_deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('id', cancelingVideoId)

        if (error) throw error

        setVideosData(prev => prev.filter(v => v.id !== cancelingVideoId))
        setShowCancelModal(false)
        setCancelReason('')
        setCancelingVideoId(null)
        showToast('✅ Video cancelled')
      } catch (err) {
        showToast('Failed to cancel: ' + err.message, 'error')
      } finally {
        setIsCancelAnimating(false)
      }
    }, 600)
  }

  const handleCloseModal = () => {
    if (cancelReason.trim() && !window.confirm('Close without saving?')) return
    setShowCancelModal(false)
    setCancelReason('')
    setCancelingVideoId(null)
  }

  const autoExpand = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const channelMap = useMemo(() => {
    return channels.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {})
  }, [channels])

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Loading Dashboard...</div>

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: COLORS.bgMain, padding: '40px 20px', overflowY: 'auto', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeOutSlideUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px currentColor; }
          50% { opacity: 0.8; transform: scale(1.4); box-shadow: 0 0 25px currentColor, 0 0 10px currentColor; }
        }
        .anim-done { animation: fadeOutSlideUp 300ms ease-out forwards; }
        .anim-shake { animation: shake 400ms ease-in-out; }
        .anim-fade { animation: fadeOut 200ms ease-out forwards; }
        .pulse-dot { animation: pulseGlow 2s infinite ease-in-out; }
        
        .insights-scroll::-webkit-scrollbar { height: 8px; }
        .insights-scroll::-webkit-scrollbar-track { background: #1a1a1a; }
        .insights-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        
        button { cursor: pointer; border: none; transition: 0.15s; }
        button:hover { opacity: 0.85; transform: translateY(-1px); }
        button:active { transform: translateY(0); }

        .overview-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: linear-gradient(145deg, #1e1e1e 0%, #121212 100%);
          border: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .overview-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.5;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .overview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 197, 94, 0.1);
        }
        .overview-card:hover::before {
          opacity: 1;
          background: linear-gradient(145deg, rgba(34, 197, 94, 0.5), rgba(255, 255, 255, 0.05));
        }
        .overview-card:hover h3 { color: #fff !important; }
        
        .insight-card {
          transition: all 0.3s ease;
          border: 1px solid #333;
        }
        .insight-card:hover {
          border-color: #22c55e66 !important;
          background-color: #222 !important;
          transform: scale(1.02);
        }
      `}</style>

      {/* SECTION 1: WELCOME + QUOTE */}
      <section style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0', color: 'white' }}>Welcome, RK 👋</h1>
        <p style={{ color: COLORS.textMuted, fontStyle: 'italic', maxWidth: '80%', margin: '0 auto', lineHeight: '1.6', fontSize: '14px' }}>
          "{quote.text}" — <span style={{ fontWeight: 600 }}>{quote.author}</span>
        </p>
      </section>

      {/* SECTION 2: DYNAMIC OVERVIEW */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '12px' }}>
          {overviewData.monthName} {overviewData.year} OVERVIEW
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div className="overview-card" style={{ flex: 1, minWidth: '320px', padding: '32px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '12px', color: COLORS.textMuted, margin: 0, fontWeight: 800, letterSpacing: '0.1em', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
              <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.blue, display: 'inline-block', color: COLORS.blue }}></span>
              THIS WEEK
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>PLANNED</div>
                <div style={{ fontSize: '36px', fontWeight: '900', display: 'flex', alignItems: 'baseline' }}>
                  <AnimatedNumber value={overviewData.week.planned} />
                  <TrendIndicator current={overviewData.week.planned} previous={prevMonthStats.planned} />
                </div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>COMPLETED</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: COLORS.green, display: 'flex', alignItems: 'baseline', textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  <AnimatedNumber value={overviewData.week.completed} />
                  <TrendIndicator current={overviewData.week.completed} previous={prevMonthStats.completed} />
                </div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>RATE</div>
                <div style={{ fontSize: '36px', fontWeight: '900' }}>
                  <AnimatedNumber value={overviewData.week.rate} suffix="%" />
                </div>
              </div>
            </div>
            {/* Ambient Background Glow */}
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: `radial-gradient(circle, ${COLORS.blue}15 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }}></div>
          </div>
          
          <div className="overview-card" style={{ flex: 1, minWidth: '320px', padding: '32px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '12px', color: COLORS.textMuted, margin: 0, fontWeight: 800, letterSpacing: '0.1em', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
              <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.orange, display: 'inline-block', color: COLORS.orange }}></span>
              THIS MONTH
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>PLANNED</div>
                <div style={{ fontSize: '36px', fontWeight: '900', display: 'flex', alignItems: 'baseline' }}>
                  <AnimatedNumber value={overviewData.month.planned} />
                  <TrendIndicator current={overviewData.month.planned} previous={prevMonthStats.planned} />
                </div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>COMPLETED</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: COLORS.green, display: 'flex', alignItems: 'baseline', textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  <AnimatedNumber value={overviewData.month.completed} />
                  <TrendIndicator current={overviewData.month.completed} previous={prevMonthStats.completed} />
                </div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700, letterSpacing: '0.05em' }}>RATE</div>
                <div style={{ fontSize: '36px', fontWeight: '900' }}>
                  <AnimatedNumber value={overviewData.month.rate} suffix="%" />
                </div>
              </div>
            </div>
            {/* Ambient Background Glow */}
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: `radial-gradient(circle, ${COLORS.orange}15 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }}></div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PENDING ACTIONS */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', color: overdueVideos.length > 0 ? COLORS.red : COLORS.textPrimary, fontWeight: 'bold', marginBottom: '16px' }}>
          ⚠️ PENDING ACTIONS — {overdueVideos.length > 0 ? `${overdueVideos.length} VIDEOS OVERDUE` : 'No pending actions'}
        </h2>
        {overdueVideos.length === 0 ? (
          <div style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: '32px', borderRadius: '8px', textAlign: 'center', color: COLORS.green }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>You're all caught up! No pending actions.</div>
          </div>
        ) : (
          overdueVideos.map(video => {
            const tColor = topicColorMap[video.topic_id] || COLORS.red;
            return (
              <div key={video.id} className={isDoneAnimating === video.id ? 'anim-done' : ''} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161616', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px 20px', borderRadius: '12px', marginBottom: '12px', gap: '20px', transition: 'all 0.3s ease', cursor: 'default', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = `${tColor}55`; e.currentTarget.style.transform = 'translateX(4px)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateX(0)'; }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'white', letterSpacing: '0.01em' }}>{video.video_title}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px' }}>
                    <span style={{ color: tColor, fontWeight: 600 }}>{channelMap[video.topic_id] || 'Unknown Topic'}</span> <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span> Scheduled: {timeAgo(video.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleMarkDone(video.id)} style={{ backgroundColor: `${COLORS.green}15`, color: COLORS.green, border: `1px solid ${COLORS.green}33`, padding: '8px 16px', fontSize: '10px', fontWeight: 800, borderRadius: '8px', letterSpacing: '0.05em' }}>DONE</button>
                  <button onClick={() => handleReschedule(video.id)} style={{ backgroundColor: `${COLORS.blue}15`, color: COLORS.blue, border: `1px solid ${COLORS.blue}33`, padding: '8px 16px', fontSize: '10px', fontWeight: 800, borderRadius: '8px', letterSpacing: '0.05em' }}>RE-SCHEDULED</button>
                  <button onClick={() => { setCancelingVideoId(video.id); setShowCancelModal(true); }} style={{ backgroundColor: `${COLORS.red}15`, color: COLORS.red, border: `1px solid ${COLORS.red}33`, padding: '8px 16px', fontSize: '10px', fontWeight: 800, borderRadius: '8px', letterSpacing: '0.05em' }}>CANCELED</button>
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* SECTION 4: UPCOMINGS */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '12px', color: COLORS.grey, fontWeight: 'bold', marginBottom: '12px' }}>NEXT 3 UPLOADS</h2>
        {upcomingVideos.length === 0 ? (
          <div style={{ color: COLORS.textSecondary, fontSize: '14px' }}>No upcoming uploads scheduled</div>
        ) : (
          upcomingVideos.map(video => {
            const days = getCountdown(video.scheduled_time)
            const badgeColor = days < 2 ? COLORS.red : days < 7 ? COLORS.orange : COLORS.green
            const tColor = topicColorMap[video.topic_id] || COLORS.blue
            return (
              <div key={video.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161616', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px 20px', borderRadius: '12px', marginBottom: '12px', transition: 'all 0.3s ease', cursor: 'default' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c'; e.currentTarget.style.borderColor = `${tColor}66`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${tColor}25, inset 0 0 20px ${tColor}05` }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#161616'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white' }}>{video.video_title}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
                     Topic: <span style={{ color: 'white', fontWeight: 500, marginLeft: '4px' }}>{channelMap[video.topic_id] || 'Unknown Topic'}</span>
                  </div>
                </div>
                <div style={{ backgroundColor: `${badgeColor}15`, border: `1px solid ${badgeColor}33`, color: badgeColor, padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em', boxShadow: `0 0 10px ${badgeColor}11` }}>
                  In {getCountdown(video.created_at)} days
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* SECTION 5: INSIGHTS */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>Insights</h2>
            <div style={{ color: COLORS.textSecondary, fontSize: '14px', marginTop: '8px', fontWeight: 500 }}>
              Highest uploads: <span style={{ color: COLORS.green, fontWeight: '700' }}>{insightsData.topTopic}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['week', 'month', '3months'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedInsightsPeriod(period)}
                style={{
                  backgroundColor: selectedInsightsPeriod === period ? COLORS.green : COLORS.bgCard,
                  color: selectedInsightsPeriod === period ? 'black' : 'white',
                  border: `1px solid ${selectedInsightsPeriod === period ? COLORS.green : '#333'}`,
                  padding: '10px 20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '6px'
                }}
              >
                {period === 'week' ? 'This Week' : period === 'month' ? 'This month' : 'Last 3 months'}
              </button>
            ))}
          </div>
        </div>

        <div className="insights-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '12px 4px 20px 4px', margin: '-12px -4px -20px -4px' }}>
          {insightsData.stats.map(topic => {
            const diff = topic.currentTotal - topic.prevTotal;
            const tColor = topicColorMap[topic.id] || '#333';
            return (
              <div key={topic.id} style={{ flex: '0 0 200px', backgroundColor: `${tColor}0A`, padding: '24px 20px', borderRadius: '16px', border: `1px solid ${tColor}25`, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = `${tColor}15`; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 24px ${tColor}20`; e.currentTarget.style.borderColor = `${tColor}50`; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = `${tColor}0A`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${tColor}25`; }}>
                <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tColor, display: 'inline-block', boxShadow: `0 0 10px ${tColor}` }}></span>
                  {topic.name}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Uploads</span>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{topic.uploads}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Planned</span>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{topic.planned}</span>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${tColor}22`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.05em' }}>COMPARED TO LAST MONTH</span>
                  {diff === 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.2)', fontWeight: '700', width: 'fit-content', fontSize: '10px', letterSpacing: '0.05em' }}>
                      <span style={{ marginRight: '4px' }}>—</span> NO CHANGE
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', backgroundColor: diff > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${diff > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, color: diff > 0 ? '#22c55e' : '#ef4444', fontWeight: '700', width: 'fit-content', fontSize: '10px', letterSpacing: '0.05em', boxShadow: `0 2px 10px ${diff > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}` }}>
                      <span style={{ fontSize: '12px', marginRight: '4px' }}>{diff > 0 ? '↑' : '↓'}</span>
                      {Math.abs(diff)} {diff > 0 ? 'NEW' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className={`${isCancelAnimating ? 'anim-shake' : ''} ${isCancelAnimating && cancelReason ? 'anim-fade' : ''}`} style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Cancellation Reason</h3>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '0', fontSize: '10px', color: cancelReason.length >= 200 ? COLORS.red : COLORS.textSecondary }}>
                {cancelReason.length}/200
              </div>
              <textarea
                ref={textareaRef}
                placeholder="Enter reason (optional)"
                maxLength={200}
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); autoExpand(e); }}
                style={{ width: '100%', minHeight: '100px', backgroundColor: '#0f0f0f', border: `1px solid ${COLORS.border}`, padding: '12px', borderRadius: '4px', color: 'white', fontSize: '14px', resize: 'none', outline: 'none', boxSizing: 'border-box', overflow: 'hidden' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleCloseModal} style={{ backgroundColor: '#333', padding: '10px 12px', fontSize: '8px', fontWeight: 800, borderRadius: '4px', color: 'white' }}>CANCEL</button>
              <button onClick={handleCancelSubmit} style={{ backgroundColor: COLORS.green, padding: '10px 12px', fontSize: '8px', fontWeight: 800, borderRadius: '4px', color: 'white' }}>SUBMIT</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: toast.type === 'success' ? COLORS.green : COLORS.red, color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default Landing
