import { useState } from 'react'
import MainDashboard from './components/MainDashboard'
import Home from './pages/Home'
import AddChannel from './pages/AddChannel'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedMyChannel, setSelectedMyChannel] = useState(null)

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
      {currentPage === 'home' && (
        <Home 
          onChannelClick={(channel) => {
            setSelectedMyChannel(channel)
            setCurrentPage('dashboard')
          }} 
          onAddClick={() => {
            setCurrentPage('add-channel')
          }}
        />
      )}
      {currentPage === 'add-channel' && (
        <div style={appStyle}>
          <AddChannel 
            onBack={() => setCurrentPage('home')}
            onSave={() => setCurrentPage('home')}
          />
        </div>
      )}
      {currentPage === 'dashboard' && (
        <div style={appStyle}>
          <MainDashboard
            selectedMyChannel={selectedMyChannel}
            onBackClick={() => setCurrentPage('home')}
          />
        </div>
      )}
    </>
  )
}

export default App
