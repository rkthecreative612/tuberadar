import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'

import Home from './pages/Home'
import AddChannel from './pages/AddChannel'
import Brainstorm from './pages/Brainstorm'
import BrainstormTopic from './pages/BrainstormTopic'
import Planner from './pages/Planner'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import RevenueTracker from './pages/RevenueTracker'
import Scheduler from './pages/Scheduler'

function AppLayout() {
  const shellStyle = {
    display: 'flex',
    width: '100%',
    height: '100vh',
    backgroundColor: '#0a0a0a',
  }

  const mainStyle = {
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
  }

  return (
    <div style={shellStyle}>
      <Sidebar />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/add-channel" element={<AddChannel />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:channelId" element={<Dashboard />} />
        <Route path="/brainstorm" element={<Brainstorm />} />
        <Route path="/brainstorm/:topicId" element={<BrainstormTopic />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/scheduler" element={<Scheduler />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/revenue" element={<RevenueTracker />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
