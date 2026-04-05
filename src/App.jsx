import Sidebar from './components/Sidebar'
import MainDashboard from './components/MainDashboard'

function App() {
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
      <Sidebar />
      <MainDashboard />
    </div>
  )
}

export default App
