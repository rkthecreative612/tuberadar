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
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#22c55e', color: '#000', fontSize: '9px', marginLeft: '8px' }}>✓</span>
  )
  const isUp = diff > 0
  return (
    <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontSize: '11px', marginLeft: '8px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{diff} than {label}
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
    } else {
      try {
        // Clear cache if date changed
        localStorage.removeItem('dailyQuote')
        localStorage.removeItem('quoteDate')

        const res = await fetch('https://api.quotable.io/random')
        if (!res.ok) throw new Error('API failed')
        const data = await res.json()
        const newQuote = { text: data.content, author: data.author }
        
        setQuote(newQuote)
        localStorage.setItem('dailyQuote', JSON.stringify(newQuote))
        localStorage.setItem('quoteDate', today)
      } catch (err) {
        console.error('Quote fetch failed:', err)
      }
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
        .anim-done { animation: fadeOutSlideUp 300ms ease-out forwards; }
        .anim-shake { animation: shake 400ms ease-in-out; }
        .anim-fade { animation: fadeOut 200ms ease-out forwards; }
        
        .insights-scroll::-webkit-scrollbar { height: 8px; }
        .insights-scroll::-webkit-scrollbar-track { background: #1a1a1a; }
        .insights-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        
        button { cursor: pointer; border: none; transition: 0.15s; }
        button:hover { opacity: 0.85; transform: translateY(-1px); }
        button:active { transform: translateY(0); }

        .overview-card {
          transition: all 0.3s ease;
          position: relative;
        }
        .overview-card:hover {
          border-color: #22c55e88 !important;
          box-shadow: 0 0 25px #22c55e15;
          transform: translateY(-2px);
        }
        .overview-card:hover h3 { color: #22c55e !important; }
        
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
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div className="overview-card" style={{ flex: 1, minWidth: '300px', backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '24px', fontWeight: 800, letterSpacing: '0.02em', transition: '0.3s' }}>THIS WEEK</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>PLANNED</div>
                <div style={{ fontSize: '32px', fontWeight: '900', display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.week.planned} />
                  <TrendIndicator current={overviewData.week.planned} previous={prevMonthStats.planned} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>COMPLETED</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.green, display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.week.completed} />
                  <TrendIndicator current={overviewData.week.completed} previous={prevMonthStats.completed} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>RATE</div>
                <div style={{ fontSize: '32px', fontWeight: '900', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.week.rate} suffix="%" />
                </div>
              </div>
            </div>
          </div>
          <div className="overview-card" style={{ flex: 1, minWidth: '300px', backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '24px', fontWeight: 800, letterSpacing: '0.02em', transition: '0.3s' }}>THIS MONTH</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>PLANNED</div>
                <div style={{ fontSize: '32px', fontWeight: '900', display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.month.planned} />
                  <TrendIndicator current={overviewData.month.planned} previous={prevMonthStats.planned} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>COMPLETED</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.green, display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.month.completed} />
                  <TrendIndicator current={overviewData.month.completed} previous={prevMonthStats.completed} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.grey, fontWeight: 700 }}>RATE</div>
                <div style={{ fontSize: '32px', fontWeight: '900', marginTop: '4px' }}>
                  <AnimatedNumber value={overviewData.month.rate} suffix="%" />
                </div>
              </div>
            </div>
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
          overdueVideos.map(video => (
          <div key={video.id} className={isDoneAnimating === video.id ? 'anim-done' : ''} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderLeft: `4px solid ${topicColorMap[video.topic_id] || COLORS.red}`, padding: '16px', borderRadius: '4px', marginBottom: '12px', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{video.video_title}</div>
              <div style={{ color: COLORS.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                Category: [{channelMap[video.topic_id] || 'Unknown Topic'}] — Scheduled: {timeAgo(video.created_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleMarkDone(video.id)} style={{ backgroundColor: COLORS.green, padding: '10px 12px', fontSize: '8px', fontWeight: 800, borderRadius: '4px', color: 'white' }}>DONE</button>
              <button onClick={() => handleReschedule(video.id)} style={{ backgroundColor: COLORS.blue, padding: '10px 12px', fontSize: '8px', fontWeight: 800, borderRadius: '4px', color: 'white' }}>RE-SCHEDULED</button>
              <button onClick={() => { setCancelingVideoId(video.id); setShowCancelModal(true); }} style={{ backgroundColor: COLORS.red, padding: '10px 12px', fontSize: '8px', fontWeight: 800, borderRadius: '4px', color: 'white' }}>CANCELED</button>
            </div>
          </div>
        )))}
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
            return (
              <div key={video.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{video.video_title}</div>
                  <div style={{ color: COLORS.textSecondary, fontSize: '12px', marginTop: '2px' }}>Topic: {channelMap[video.topic_id] || 'Unknown Topic'}</div>
                </div>
                <div style={{ color: badgeColor, fontSize: '12px', fontWeight: 600 }}>
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

        <div className="insights-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {insightsData.stats.map(topic => {
            const diff = topic.currentTotal - topic.prevTotal;
            return (
              <div key={topic.id} className="insight-card" style={{ flex: '0 0 200px', backgroundColor: COLORS.bgCard, padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${topicColorMap[topic.id] || '#333'}` }}>
                <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.name}</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                    No. of uploads : <span style={{ color: 'white', fontWeight: '700' }}>{topic.uploads}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                    Planned : <span style={{ color: 'white', fontWeight: '700' }}>{topic.planned}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: COLORS.textMuted }}>
                  Compared to Previous month: 
                  {diff === 0 ? (
                    <span style={{ color: COLORS.green }}>✓</span>
                  ) : (
                    <span style={{ color: diff > 0 ? COLORS.green : COLORS.red, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ backgroundColor: diff > 0 ? COLORS.green : COLORS.red, color: 'black', padding: '1px 3px', borderRadius: '2px', fontSize: '8px' }}>
                        {diff > 0 ? '▲' : '▼'}
                      </span>
                      {diff > 0 ? `+${diff}` : diff} {diff > 0 ? 'new' : ''}
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
