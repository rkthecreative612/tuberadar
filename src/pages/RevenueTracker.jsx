import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function RevenueTracker() {
  const navigate = useNavigate()
  const [year, setYear] = useState(new Date().getFullYear())
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [channels, setChannels] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [breakdownData, setBreakdownData] = useState([])
  const [sections, setSections] = useState([])
  const [checkedTopics, setCheckedTopics] = useState(new Set())
  const [editingCell, setEditingCell] = useState(null) // { channelId, monthIndex }
  
  const currentMonthIdx = new Date().getMonth()
  const isCurrentYear = year === new Date().getFullYear()

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch channels
      const { data: channelsData } = await supabase.from('my_channels').select('*')
      if (channelsData) {
        setChannels(channelsData)
        // Check all by default
        setCheckedTopics(new Set(channelsData.map(c => c.id)))
      }

      // Fetch sections
      const { data: secData } = await supabase.from('revenue_sections').select('*')
      if (secData) setSections(secData)

      // Fetch revenue
      const { data: revData } = await supabase
        .from('revenue_tracking')
        .select('*')
        .eq('year', year)
      
      if (revData) {
        setRevenueData(revData)
        
        // Fetch breakdowns for these rows
        const revIds = revData.map(r => r.id)
        if (revIds.length > 0) {
          const { data: brkData } = await supabase
            .from('revenue_breakdown')
            .select('*')
            .in('revenue_id', revIds)
          if (brkData) setBreakdownData(brkData)
        }
      }
    }
    fetchData()
  }, [year])

  // Fetch exchange rate
  useEffect(() => {
    if (currency === 'INR') {
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
          setExchangeRate(data.rates.INR)
        })
        .catch(err => console.error('Exchange rate fetch failed:', err))
    } else {
      setExchangeRate(1)
    }
  }, [currency])

  const formatValue = (val) => {
    const converted = val * exchangeRate
    const symbol = currency === 'USD' ? '$' : '₹'
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const handleEdit = async (channelId, monthIndex, value) => {
    let numValue = parseFloat(value) || 0
    
    if (numValue < 0 || numValue > 1000) {
      alert('Enter valid amount (0 - 1000)')
      numValue = Math.max(0, Math.min(1000, numValue))
    }

    const monthName = months[monthIndex]

    // Update local state first for instant feedback
    const newData = [...revenueData]
    const existingIndex = newData.findIndex(r => r.channel_id === channelId && r.month === monthName && r.year === year)
    
    if (existingIndex > -1) {
      newData[existingIndex].total_revenue = numValue
    } else {
      newData.push({ channel_id: channelId, month: monthName, year, total_revenue: numValue })
    }
    setRevenueData(newData)
    setEditingCell(null)

    // DB Update
    const { data: existing } = await supabase
      .from('revenue_tracking')
      .select('id')
      .eq('channel_id', channelId)
      .eq('month', monthName)
      .eq('year', year)
      .single()

    let revId
    if (existing) {
      revId = existing.id
      await supabase
        .from('revenue_tracking')
        .update({ total_revenue: numValue })
        .eq('id', revId)
    } else {
      const { data: inserted } = await supabase
        .from('revenue_tracking')
        .insert({ channel_id: channelId, month: monthName, year, total_revenue: numValue })
        .select()
        .single()
      revId = inserted?.id
    }

    // Sync with 'AdSense' section in breakdown (default bucket)
    if (revId) {
      // Find 'AdSense' section ID
      const targetSection = sections.find(s => s.section_name.toLowerCase() === 'adsense')
      if (targetSection) {
        // Get all breakdowns for this month
        const { data: currentBrks } = await supabase
          .from('revenue_breakdown')
          .select('*')
          .eq('revenue_id', revId)
        
        const targetBrk = currentBrks?.find(b => b.section_id === targetSection.id)
        const othersTotal = currentBrks?.filter(b => b.section_id !== targetSection.id).reduce((sum, b) => sum + (b.amount || 0), 0) || 0
        
        // Ensure AdSense is never negative
        const newTargetAmount = Math.max(0, numValue - othersTotal)
        const actualTotal = othersTotal + newTargetAmount

        if (targetBrk) {
          await supabase.from('revenue_breakdown').update({ amount: newTargetAmount }).eq('id', targetBrk.id)
        } else {
          await supabase.from('revenue_breakdown').insert({ revenue_id: revId, section_id: targetSection.id, amount: newTargetAmount })
        }
        
        // If the entered total was less than breakdowns, sync total_revenue back to the actual sum
        if (actualTotal !== numValue) {
          await supabase.from('revenue_tracking').update({ total_revenue: actualTotal }).eq('id', revId)
          setRevenueData(prev => prev.map(r => r.id === revId ? { ...r, total_revenue: actualTotal } : r))
        }

        // Refresh breakdown data locally
        const { data: updatedBrks } = await supabase
          .from('revenue_breakdown')
          .select('*')
          .in('revenue_id', revenueData.map(r => r.id))
        if (updatedBrks) setBreakdownData(updatedBrks)
      }
    }
  }

  // Calculate totals
  const stats = useMemo(() => {
    let total = 0
    // Group breakdowns by section name (case-insensitive)
    const sectionTotals = {} // lowercase -> { amount, originalName }

    revenueData.forEach(row => {
      if (checkedTopics.has(row.channel_id)) {
        total += (row.total_revenue || 0)
        
        const rowBreakdowns = breakdownData.filter(b => b.revenue_id === row.id)
        const allowedSections = ['adsense', 'affiliate', 'sponsor', 'other']
        
        rowBreakdowns.forEach(brk => {
          const section = sections.find(s => s.id === brk.section_id)
          if (section && allowedSections.includes(section.section_name?.toLowerCase())) {
            const name = section.section_name
            const lower = name?.toLowerCase()
            if (lower && !sectionTotals[lower]) {
              sectionTotals[lower] = { amount: 0, originalName: name }
            }
            if (lower) sectionTotals[lower].amount += (brk.amount || 0)
          }
        })
      }
    })

    // Sort and get top sections with amount > 0
    const sorted = Object.values(sectionTotals)
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    
    const allActive = sorted // Show all sections with amount > 0

    return { total, allActive }
  }, [revenueData, breakdownData, sections, checkedTopics])

  const getMonthRevenue = (channelId, monthName) => {
    const row = revenueData.find(r => r.channel_id === channelId && r.month === monthName && r.year === year)
    return row ? row.total_revenue : 0
  }

  const getTopicTotal = (channelId) => {
    return revenueData
      .filter(r => r.channel_id === channelId && r.year === year)
      .reduce((sum, r) => sum + (r.total_revenue || 0), 0)
  }

  // Styles
  const containerStyle = {
    padding: '24px',
    background: '#0f0f0f',
    minHeight: '100vh',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  }

  const yearToggleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#1a1a1a',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #333',
  }
  
  const arrowButtonStyle = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }

  const statCardsContainer = {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    width: '100%',
    overflowX: 'auto', // Fallback for very small screens
    padding: '4px' // Padding for glow
  }

  const statCardStyle = {
    background: '#1a1a1a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1',
    minWidth: '150px',
    transition: 'all 0.3s ease',
    cursor: 'default',
    position: 'relative'
  }

  const tableContainerStyle = {
    background: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
    overflow: 'hidden',
  }

  const rowStyle = (checked) => ({
    display: 'grid',
    gridTemplateColumns: '200px repeat(12, 1fr) 100px',
    borderBottom: '1px solid #333',
    opacity: checked ? 1 : 0.4,
    background: checked ? 'transparent' : '#0a0a0a',
  })

  const cellStyle = {
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    borderRight: '1px solid #333',
    minWidth: '60px',
    textAlign: 'center'
  }

  const inputStyle = {
    width: '100%',
    background: '#333',
    border: '1px solid #3b82f6',
    color: '#fff',
    padding: '4px',
    borderRadius: '4px',
    textAlign: 'center',
    outline: 'none'
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .stat-card-glow:hover {
        border-color: #22c55e !important;
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
        transform: translateY(-4px);
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0 }}>Revenue <span style={{ color: '#22c55e' }}>Tracker</span></h2>
          <div style={yearToggleStyle}>
            <button style={arrowButtonStyle} onClick={() => setYear(prev => prev - 1)}>◄</button>
            <span style={{ fontSize: '18px', fontWeight: 'bold', width: '60px', textAlign: 'center' }}>{year}</span>
            <button style={arrowButtonStyle} onClick={() => setYear(prev => prev + 1)}>►</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="radio" name="currency" checked={currency === 'USD'} onChange={() => setCurrency('USD')} />
            USD
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="radio" name="currency" checked={currency === 'INR'} onChange={() => setCurrency('INR')} />
            INR
          </label>
        </div>
      </div>

      <div style={statCardsContainer}>
        <div className="stat-card-glow" style={{ ...statCardStyle, borderColor: '#22c55e' }}>
          <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold' }}>TOTAL OVERALL</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{formatValue(stats.total)}</span>
        </div>
        {stats.allActive.map((item, idx) => (
          <div key={idx} className="stat-card-glow" style={statCardStyle}>
            <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold' }}>{item.originalName.toUpperCase()}</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatValue(item.amount)}</span>
          </div>
        ))}
      </div>

      <div style={tableContainerStyle}>
        {/* Header Row */}
        <div style={{ ...rowStyle(true), background: '#222', fontWeight: 'bold' }}>
          <div style={{ ...cellStyle, justifyContent: 'flex-start' }}>TOPIC</div>
          {months.map((m, idx) => (
            <div 
              key={m} 
              style={{ 
                ...cellStyle, 
                ...(isCurrentYear && idx === currentMonthIdx ? { 
                  background: 'rgba(34, 197, 94, 0.08)',
                  color: '#22c55e'
                } : {}) 
              }}
            >
              {m}
            </div>
          ))}
          <div style={{ ...cellStyle, borderRight: 'none' }}>TOTAL</div>
        </div>

        {/* Data Rows */}
        {channels.map(ch => {
          const checked = checkedTopics.has(ch.id)
          return (
            <div key={ch.id} style={rowStyle(checked)}>
              <div style={{ ...cellStyle, justifyContent: 'flex-start', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={checked} 
                  onChange={() => {
                    const next = new Set(checkedTopics)
                    if (next.has(ch.id)) next.delete(ch.id)
                    else next.add(ch.id)
                    setCheckedTopics(next)
                  }}
                />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
                <button 
                  onClick={() => navigate(`/topic-revenue/${ch.id}`)}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '18px' }}
                >
                  →
                </button>
              </div>

              {months.map((m, idx) => {
                const val = getMonthRevenue(ch.id, m)
                const isEditing = editingCell?.channelId === ch.id && editingCell?.monthIndex === idx
                
                return (
                  <div 
                    key={m} 
                    style={{ 
                      ...cellStyle, 
                      ...(isCurrentYear && idx === currentMonthIdx ? { background: 'rgba(34, 197, 94, 0.04)' } : {})
                    }} 
                    onDoubleClick={() => setEditingCell({ channelId: ch.id, monthIndex: idx })}
                  >
                    {isEditing ? (
                      <input 
                        autoFocus
                        style={inputStyle}
                        defaultValue={val}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(ch.id, idx, e.target.value)
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        onBlur={(e) => handleEdit(ch.id, idx, e.target.value)}
                      />
                    ) : (
                      formatValue(val)
                    )}
                  </div>
                )
              })}

              <div style={{ ...cellStyle, borderRight: 'none', fontWeight: 'bold' }}>
                {formatValue(getTopicTotal(ch.id))}
              </div>
            </div>
          )
        })}

        {/* Bottom Total Row */}
        <div style={{ ...rowStyle(true), background: '#222', fontWeight: 'bold' }}>
          <div style={{ ...cellStyle, justifyContent: 'flex-start' }}>TOTAL</div>
          {months.map((m, idx) => {
            const totalForMonth = channels
              .filter(ch => checkedTopics.has(ch.id))
              .reduce((sum, ch) => sum + getMonthRevenue(ch.id, m), 0)
            return (
              <div 
                key={m} 
                style={{ 
                  ...cellStyle, 
                  ...(isCurrentYear && idx === currentMonthIdx ? { background: 'rgba(34, 197, 94, 0.08)' } : {}) 
                }}
              >
                {formatValue(totalForMonth)}
              </div>
            )
          })}
          <div style={{ ...cellStyle, borderRight: 'none', color: '#22c55e' }}>{formatValue(stats.total)}</div>
        </div>
      </div>
    </div>
  )
}

export default RevenueTracker
