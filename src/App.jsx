import { useState } from 'react'
import MainDashboard from './components/MainDashboard'
import Home from './pages/Home'

function App() {
  const [activeTopic, setActiveTopic] = useState('tech review india 2026')
  const [activeChannel, setActiveChannel] = useState('TechTalks IN')
  const [activeContentType, setActiveContentType] = useState('videos')
  const [isChannelUrl, setIsChannelUrl] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedChannel, setSelectedChannel] = useState(null)

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
    <>
      {currentPage === 'home' ? (
        <Home onChannelClick={(channel) => {
          console.log('Clicked channel:', channel);
          setSelectedChannel(channel)
          setActiveChannel(channel.name)
          setActiveTopic(channel.name)
          setCurrentPage('dashboard')
        }} />
      ) : (
        <div style={appStyle}>
          <MainDashboard
            searchTopic={activeTopic}
            channelName={activeChannel}
            contentType={activeContentType}
            isChannelUrl={isChannelUrl}
            selectedChannel={selectedChannel}
            onBackClick={() => setCurrentPage('home')}
          />
        </div>
      )}
    </>
  )
}

export default App
