import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MainDashboard from './components/MainDashboard'

function App() {
  const [activeTopic, setActiveTopic] = useState('tech review india 2026')
  const [activeChannel, setActiveChannel] = useState('TechTalks IN')
  const [activeContentType, setActiveContentType] = useState('videos')
  const [isChannelUrl, setIsChannelUrl] = useState(false)

  const appStyle = {
    display: 'flex',
    width: '100%',
    height: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: '#0a0a0a',
    boxSizing: 'border-box',
  }

  return (
    <div style={appStyle}>
      <Sidebar
        onChannelSelect={(channelName, channelId, contentType) => {
          setActiveTopic(channelId)
          setActiveChannel(channelName)
          setActiveContentType(contentType ?? 'videos')
          setIsChannelUrl(String(channelId ?? '').trim().startsWith('@'))
        }}
      />
      <MainDashboard
        searchTopic={activeTopic}
        channelName={activeChannel}
        contentType={activeContentType}
        isChannelUrl={isChannelUrl}
      />
    </div>
  )
}

export default App
