import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function TopicRevenueDetail() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  
  // States
  const [topicName, setTopicName] = useState('')
  const [topicColor, setTopicColor] = useState('#22c55e')
  const [year, setYear] = useState(new Date().getFullYear())
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [sections, setSections] = useState([])
  const [trackingData, setTrackingData] = useState([]) // rows in revenue_tracking
  const [breakdownData, setBreakdownData] = useState([]) // rows in revenue_breakdown
  const [editingCell, setEditingCell] = useState(null) // { month, sectionId }
  
  const currentMonthName = months[new Date().getMonth()]
  const isCurrentYear = year === new Date().getFullYear()

  // Fetch Topic Info
  useEffect(() => {
    const fetchTopic = async () => {
      const { data } = await supabase.from('my_channels').select('name, color').eq('id', channelId).single()
      if (data) {
        setTopicName(data.name)
        setTopicColor(data.color || '#22c55e')
      }
    }
    fetchTopic()
  }, [channelId])

  // Fetch Sections & Data
  const fetchData = async () => {
    // 1. Sections - Ensure defaults exist
    const defaultSections = ['AdSense', 'Affiliate', 'Sponsor', 'Other']
    let { data: secData } = await supabase.from('revenue_sections').select('*').order('position')
    
    // Check if defaults are missing
    const existingNames = secData ? secData.map(s => s.section_name.toLowerCase()) : []
    const missingDefaults = defaultSections.filter(name => !existingNames.includes(name.toLowerCase()))
    
    if (missingDefaults.length > 0) {
      const lastPos = secData && secData.length > 0 ? Math.max(...secData.map(s => s.position)) : 0
      const newSections = missingDefaults.map((name, i) => ({
        workspace_id: 'default',
        section_name: name,
        position: lastPos + i + 1
      }))
      await supabase.from('revenue_sections').insert(newSections)
      // Re-fetch
      const { data: updatedSecData } = await supabase.from('revenue_sections').select('*').order('position')
      secData = updatedSecData
    }
    
    if (secData) {
      const fixedNames = ['AdSense', 'Affiliate', 'Sponsor', 'Other']
      const filtered = secData.filter(s => fixedNames.includes(s.section_name))
      setSections(filtered)
    }

    // 2. Tracking Rows for this topic/year
    const { data: trackData } = await supabase
      .from('revenue_tracking')
      .select('*')
      .eq('channel_id', channelId)
      .eq('year', year)
    
    if (trackData) {
      setTrackingData(trackData)
      
      // 3. Breakdowns for these rows
      const trackingIds = trackData.map(r => r.id)
      if (trackingIds.length > 0) {
        const { data: brkData } = await supabase
          .from('revenue_breakdown')
          .select('*')
          .in('revenue_id', trackingIds)
        if (brkData) setBreakdownData(brkData)
      } else {
        setBreakdownData([])
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [channelId, year])

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

  const handleEdit = async (month, sectionId, value) => {
    let numValue = parseFloat(value) || 0

    if (numValue < 0 || numValue > 1000) {
      alert('Enter valid amount (0 - 1000)')
      numValue = Math.max(0, Math.min(1000, numValue))
    }
    
    // 1. Get or create revenue_tracking row for this month
    let trackingRow = trackingData.find(r => r.month === month)
    if (!trackingRow) {
      const { data: newRow, error } = await supabase
        .from('revenue_tracking')
        .insert({ channel_id: channelId, month, year, total_revenue: 0 })
        .select()
        .single()
      if (error) return
      trackingRow = newRow
      setTrackingData(prev => [...prev, newRow])
    }

    // 2. Update breakdown
    const existingBreakdown = breakdownData.find(b => b.revenue_id === trackingRow.id && b.section_id === sectionId)
    
    if (existingBreakdown) {
      await supabase
        .from('revenue_breakdown')
        .update({ amount: numValue })
        .eq('id', existingBreakdown.id)
      
      setBreakdownData(prev => prev.map(b => b.id === existingBreakdown.id ? { ...b, amount: numValue } : b))
    } else {
      const { data: newBrk } = await supabase
        .from('revenue_breakdown')
        .insert({ revenue_id: trackingRow.id, section_id: sectionId, amount: numValue })
        .select()
        .single()
      if (newBrk) setBreakdownData(prev => [...prev, newBrk])
    }

    // 3. Update total_revenue in revenue_tracking
    // Fetch latest breakdowns for this month to get an accurate total
    const { data: latestBrks } = await supabase
      .from('revenue_breakdown')
      .select('amount')
      .eq('revenue_id', trackingRow.id)
    
    const newTotal = latestBrks?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
    
    await supabase
      .from('revenue_tracking')
      .update({ total_revenue: newTotal })
      .eq('id', trackingRow.id)
    
    setTrackingData(prev => prev.map(r => r.id === trackingRow.id ? { ...r, total_revenue: newTotal } : r))
    setEditingCell(null)
  }

  const getBreakdownAmount = (month, sectionId) => {
    const trackRow = trackingData.find(r => r.month === month)
    if (!trackRow) return 0
    const brk = breakdownData.find(b => b.revenue_id === trackRow.id && b.section_id === sectionId)
    return brk ? brk.amount : 0
  }

  const getMonthTotal = (month) => {
    const trackRow = trackingData.find(r => r.month === month)
    return trackRow ? trackRow.total_revenue : 0
  }

  // Styles
  const containerStyle = {
    padding: '24px',
    background: '#0f0f0f',
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }


  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  }

  const backButtonStyle = {
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  }

  const tableStyle = {
    width: '100%',
    minWidth: '800px',
    borderCollapse: 'collapse',
    background: '#1a1a1a',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #333',
    tableLayout: 'fixed'
  }

  const thStyle = {
    padding: '16px',
    textAlign: 'center',
    background: '#222',
    borderBottom: '1px solid #333',
    borderRight: '1px solid #333',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#999'
  }

  const tdStyle = {
    padding: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #333',
    borderRight: '1px solid #333',
    fontSize: '14px'
  }

  const inputStyle = {
    width: '80px',
    background: '#333',
    border: '1px solid #22c55e',
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
      /* Custom Dark Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0f0f0f;
      }
      ::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #444;
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const statCardsContainer = {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    width: '100%',
    overflowX: 'auto',
    padding: '4px'
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

  const topicStats = useMemo(() => {
    let total = months.reduce((sum, m) => sum + getMonthTotal(m), 0)
    const sectionTotals = {} // lowercase -> { amount, originalName }

    trackingData.forEach(row => {
      const rowBreakdowns = breakdownData.filter(b => b.revenue_id === row.id)
      rowBreakdowns.forEach(brk => {
        const section = sections.find(s => s.id === brk.section_id)
        if (section) {
          const name = section.section_name
          const lower = name?.toLowerCase()
          if (lower && !sectionTotals[lower]) {
            sectionTotals[lower] = { amount: 0, originalName: name }
          }
          if (lower) sectionTotals[lower].amount += (brk.amount || 0)
        }
      })
    })

    const sorted = Object.values(sectionTotals)
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    const allActive = sorted
    return { total, allActive }
  }, [trackingData, breakdownData, sections])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button style={backButtonStyle} onClick={() => navigate('/revenue')}>
            <span>◄</span> Back
          </button>
          <h2 style={{ margin: 0 }}>Topic: <span style={{ color: topicColor }}>{topicName}</span></h2>
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
          <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold' }}>TOPIC OVERALL</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{formatValue(topicStats.total)}</span>
        </div>
        {topicStats.allActive.map((item, idx) => (
          <div key={idx} className="stat-card-glow" style={statCardStyle}>
            <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold' }}>{item.originalName.toUpperCase()}</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatValue(item.amount)}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', width: '100%', borderRadius: '12px' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '120px' }}>MONTH</th>
              {sections.map(sec => (
                <th key={sec.id} style={thStyle}>
                  <span>{sec.section_name.toUpperCase()}</span>
                </th>
              ))}
              <th style={{ ...thStyle, borderRight: 'none', color: '#22c55e' }}>OVERALL</th>
            </tr>
          </thead>
          <tbody>
            {months.map(month => {
              const isThisMonth = isCurrentYear && month === currentMonthName
              return (
                <tr key={month} style={isThisMonth ? { background: 'rgba(34, 197, 94, 0.05)' } : {}}>
                  <td style={{ 
                    ...tdStyle, 
                    textAlign: 'left', 
                    fontWeight: 'bold', 
                    background: isThisMonth ? 'rgba(34, 197, 94, 0.1)' : '#141414',
                    color: isThisMonth ? '#22c55e' : '#fff'
                  }}>{month}</td>
                {sections.map(sec => {
                  const val = getBreakdownAmount(month, sec.id)
                  const isEditing = editingCell?.month === month && editingCell?.sectionId === sec.id
                  return (
                    <td 
                      key={sec.id} 
                      style={tdStyle} 
                      onDoubleClick={() => setEditingCell({ month, sectionId: sec.id })}
                    >
                      {isEditing ? (
                        <input 
                          autoFocus
                          style={inputStyle}
                          defaultValue={val}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(month, sec.id, e.target.value)
                            if (e.key === 'Escape') setEditingCell(null)
                          }}
                          onBlur={(e) => handleEdit(month, sec.id, e.target.value)}
                        />
                      ) : (
                        formatValue(val)
                      )}
                    </td>
                  )
                })}
                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#22c55e', borderRight: 'none' }}>{formatValue(getMonthTotal(month))}</td>
                </tr>
              )
            })}
            {/* Total Row */}
            <tr style={{ background: '#222' }}>
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold' }}>TOTAL</td>
              {sections.map(sec => {
                const totalForSec = months.reduce((sum, m) => sum + getBreakdownAmount(m, sec.id), 0)
                return <td key={sec.id} style={{ ...tdStyle, fontWeight: 'bold' }}>{formatValue(totalForSec)}</td>
              })}
              <td style={{ ...tdStyle, fontWeight: 'bold', color: '#22c55e', borderRight: 'none' }}>
                {formatValue(months.reduce((sum, m) => sum + getMonthTotal(m), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}

export default TopicRevenueDetail
