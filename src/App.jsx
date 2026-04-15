import { useState } from 'react'
import MainDashboard from './components/MainDashboard'
import Home from './pages/Home'
import AddChannel from './pages/AddChannel'
import Brainstorm from './pages/Brainstorm'
import BrainstormTopic from './pages/BrainstormTopic'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [selectedMyChannel, setSelectedMyChannel] = useState(null)
  const [selectedBrainstormTopic, setSelectedBrainstormTopic] = useState(null)

  const appStyle = {
    display: 'flex',
    width: '100%',
    height: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: '#0a0a0a',
    boxSizing: 'border-box',
  }

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
  }

  const navStyle = {
    width: '100%',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #222',
    height: '52px',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    flexShrink: 0
  }

  const logoStyle = {
    color: 'red',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  }

  const navLinksStyle = {
    display: 'flex',
    gap: '24px',
  }

  const getLinkStyle = (page) => ({
    cursor: 'pointer',
    color: activePage === page ? 'white' : 'gray',
    textDecoration: activePage === page ? 'underline' : 'none',
    textDecorationColor: activePage === page ? 'red' : 'transparent',
    textUnderlineOffset: '6px',
    fontWeight: 500,
  })

  const Nav = () => (
    <div style={navStyle}>
      <div style={logoStyle}>TubeRadar</div>
      <div style={navLinksStyle}>
        <div style={getLinkStyle('home')} onClick={() => setActivePage('home')}>Home</div>
        <div style={getLinkStyle('brainstorm')} onClick={() => setActivePage('brainstorm')}>Brainstorm</div>
        <div style={getLinkStyle('planner')} onClick={() => setActivePage('planner')}>Planner</div>
      </div>
    </div>
  )

  return (
    <div style={containerStyle}>
      {activePage !== 'dashboard' && <Nav />}
      
      {activePage === 'home' && (
        <Home 
          setActivePage={setActivePage}
          onChannelClick={(channel) => {
            setSelectedMyChannel(channel)
            setActivePage('dashboard')
          }} 
          onAddClick={() => {
            setActivePage('add-channel')
          }}
        />
      )}
      
      {activePage === 'brainstorm' && (
        <Brainstorm 
          setActivePage={setActivePage}
          onOpenTopic={(topic) => {
            setSelectedBrainstormTopic(topic)
            setActivePage('brainstorm-topic')
          }}
        />
      )}
      
      {activePage === 'brainstorm-topic' && (
        <BrainstormTopic 
          topic={selectedBrainstormTopic} 
          onBack={() => setActivePage('brainstorm')} 
        />
      )}
      
      {activePage === 'planner' && (
        <div style={{ color: 'white', padding: '24px' }}>
          <h2>Planner</h2>
        </div>
      )}
      
      {activePage === 'add-channel' && (
        <div style={appStyle}>
          <AddChannel 
            setActivePage={setActivePage}
            onBack={() => setActivePage('home')}
            onSave={() => setActivePage('home')}
          />
        </div>
      )}
      
      {activePage === 'dashboard' && (
        <div style={appStyle}>
          <MainDashboard
            setActivePage={setActivePage}
            selectedMyChannel={selectedMyChannel}
            onBackClick={() => setActivePage('home')}
          />
        </div>
      )}
    </div>
  )
}

export default App
