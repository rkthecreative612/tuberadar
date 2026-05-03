import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import MainDashboard from '../components/MainDashboard'

function Dashboard() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const [selectedMyChannel, setSelectedMyChannel] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!channelId) {
      setSelectedMyChannel(null)
      return
    }

    let alive = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('my_channels').select('*').eq('id', channelId).maybeSingle()
      if (!alive) return
      if (!error && data) {
        setSelectedMyChannel(data)
      } else {
        setSelectedMyChannel(null)
      }
      setLoading(false)
    }

    load()
    return () => {
      alive = false
    }
  }, [channelId])

  if (!channelId) {
    return (
      <div style={{ color: 'white', padding: '24px', height: '100%', overflowY: 'auto', background: '#0f0f0f' }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ color: '#aaa' }}>Pick a channel from Home to view its dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return <div style={{ color: '#aaa', padding: '24px' }}>Loading…</div>
  }

  if (!selectedMyChannel) {
    return (
      <div style={{ color: 'white', padding: '24px', height: '100%', overflowY: 'auto', background: '#0f0f0f' }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ color: '#aaa' }}>Channel not found.</p>
      </div>
    )
  }

  return (
    <MainDashboard
      selectedMyChannel={selectedMyChannel}
      onBackClick={() => navigate('/home')}
    />
  )
}

export default Dashboard

