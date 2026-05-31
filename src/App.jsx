import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import Sidebar from './components/Sidebar'

import Home from './pages/Home'
import AddChannel from './pages/AddChannel'
import Brainstorm from './pages/Brainstorm'
import BrainstormTopic from './pages/BrainstormTopic'
import Planner from './pages/Planner'
import Dashboard from './pages/Dashboard'

import RevenueTracker from './pages/RevenueTracker'
import Scheduler from './pages/Scheduler'
import Status from './pages/Status'
import DeletedVideos from './pages/DeletedVideos'
import SmartSearch from './pages/SmartSearch'
import Landing from './pages/Landing'
import Login from './pages/Login'
import CompletedVideos from './pages/CompletedVideos'
import TopicRevenueDetail from './pages/TopicRevenueDetail'
import { deleteOldDeletedVideos } from './lib/autoDeleteOldVideos'




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
    overflowY: 'auto',
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
  useEffect(() => {
    // Run auto-delete check when app loads
    deleteOldDeletedVideos();
    
    // Also run it every hour
    const interval = setInterval(() => {
      deleteOldDeletedVideos();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (

    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/add-channel" element={<AddChannel />} />

        <Route path="/home/:channelId" element={<Dashboard />} />
        <Route path="/brainstorm" element={<Brainstorm />} />
        <Route path="/brainstorm/:topicId" element={<BrainstormTopic />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/scheduler" element={<Scheduler />} />
        <Route path="/status" element={<Status />} />
        <Route path="/deleted-videos" element={<DeletedVideos />} />
        <Route path="/completed-videos" element={<CompletedVideos />} />
        <Route path="/smart-search" element={<SmartSearch />} />



        <Route path="/revenue" element={<RevenueTracker />} />
        <Route path="/topic-revenue/:channelId" element={<TopicRevenueDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
