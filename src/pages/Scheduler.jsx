import React, { useEffect, useState, useMemo } from 'react';
import supabase from '../lib/supabase';
import SchedulerCalendar from '../components/SchedulerCalendar';
import VideoDetailsModal from '../components/VideoDetailsModal';

const COLORS = {
  bgMain: '#0f0f0f',
  bgCard: '#1a1a1a',
  border: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  accent: '#ef4444',
  buttonBg: '#222222',
};

const TOPIC_COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

const Scheduler = () => {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: channelsData, error: channelsError } = await supabase
        .from('my_channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);

      const { data: videosData, error: videosError } = await supabase
        .from('planner_videos')
        .select('*')
        .eq('status', 'scheduled');

      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const topicColorMap = useMemo(() => {
    const map = {};
    channels.forEach((channel, index) => {
      map[channel.id] = TOPIC_COLORS[index % TOPIC_COLORS.length];
    });
    return map;
  }, [channels]);

  const filteredVideos = useMemo(() => {
    let result = videos;
    if (activeFilters.size > 0) {
      result = videos.filter(v => activeFilters.has(v.topic_id));
    }
    // Enrich videos with topic name for the calendar
    return result.map(v => ({
      ...v,
      topic_name: channels.find(c => c.id === v.topic_id)?.name || 'Unknown'
    }));
  }, [videos, activeFilters, channels]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const toggleFilter = (channelId) => {
    const next = new Set(activeFilters);
    if (next.has(channelId)) {
      next.delete(channelId);
    } else {
      next.add(channelId);
    }
    setActiveFilters(next);
  };

  const handleDeleteSuccess = (deletedId) => {
    setVideos(prev => prev.filter(v => v.id !== deletedId));
  };

  const onMoveVideo = async (videoId, newDateStr) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const originalDate = video.created_at;
    const newDate = new Date(newDateStr).toDateString();

    if (new Date(originalDate).toDateString() === newDate) {
      return; // Do nothing if dropped on the same date
    }

    // Local update for immediate UI response
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, created_at: new Date(newDateStr).toISOString() } : v));

    try {
      const { error } = await supabase
        .from('planner_videos')
        .update({ created_at: new Date(newDateStr).toISOString() })
        .eq('id', videoId);

      if (error) throw error;

      setToast({ text: `✅ Video moved to ${new Date(newDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, kind: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Drag error:', err);
      // Revert if error
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, created_at: originalDate } : v));
      setToast({ text: 'Failed to move video.', kind: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: COLORS.bgMain,
    color: COLORS.textPrimary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden', // No scrollbars at page level
  };

  const topBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: `1px solid ${COLORS.border}`,
    flexShrink: 0,
  };

  const mainContentStyle = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden', // No scrollbars here
  };

  const calendarContainerStyle = {
    flex: 1,
    padding: '16px',
    overflow: 'hidden', // No scrollbars for container
  };

  const rightSidebarStyle = {
    width: '240px',
    borderLeft: `1px solid ${COLORS.border}`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#0a0a0a',
    overflowY: 'auto', // Vertical scroll only if topics overflow
    flexShrink: 0,
  };

  const viewButtonStyle = (active) => ({
    padding: '6px 12px',
    backgroundColor: active ? '#222' : 'transparent',
    color: active ? '#fff' : COLORS.textSecondary,
    border: `1px solid ${active ? '#444' : 'transparent'}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: active ? 'default' : 'pointer',
  });

  const monthStr = currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' });

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Tasks</h2>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#161616', padding: '3px', borderRadius: '8px' }}>
            <button style={viewButtonStyle(true)}>Calendar</button>
            <button style={{ ...viewButtonStyle(false), opacity: 0.5, cursor: 'not-allowed' }}>List</button>
            <button style={{ ...viewButtonStyle(false), opacity: 0.5, cursor: 'not-allowed' }}>Cards</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161616', padding: '3px', borderRadius: '8px' }}>
            <button 
              onClick={handlePrevMonth}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }}
            >←</button>
            <div style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '70px', textAlign: 'center' }}>{monthStr}</div>
            <button 
              onClick={handleNextMonth}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }}
            >→</button>
          </div>
        </div>
      </div>

      <div style={mainContentStyle}>
        <div style={calendarContainerStyle}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: COLORS.textSecondary }}>Loading...</div>
          ) : (
            <SchedulerCalendar 
              currentMonth={currentMonth}
              videos={filteredVideos}
              topicColors={topicColorMap}
              onVideoClick={(video) => {
                setSelectedVideo(video);
                setShowModal(true);
              }}
              onMoveVideo={onMoveVideo}
            />
          )}
        </div>

        <div style={rightSidebarStyle}>
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>Filter by Topic</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {channels.map(channel => {
                const isActive = activeFilters.has(channel.id) || activeFilters.size === 0;
                return (
                  <div 
                    key={channel.id}
                    onClick={() => toggleFilter(channel.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: activeFilters.has(channel.id) ? '#1a1a1a' : 'transparent',
                      border: `1px solid ${activeFilters.has(channel.id) ? '#333' : 'transparent'}`,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '2px', 
                      backgroundColor: topicColorMap[channel.id],
                      opacity: isActive ? 1 : 0.3
                    }}></div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: isActive ? '#fff' : COLORS.textSecondary,
                      fontWeight: activeFilters.has(channel.id) ? 'bold' : 'normal',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{channel.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedVideo && (
        <VideoDetailsModal 
          video={selectedVideo}
          topicName={channels.find(c => c.id === selectedVideo.topic_id)?.name || 'Unknown'}
          topicColor={topicColorMap[selectedVideo.topic_id]}
          onClose={() => {
            setShowModal(false);
            setSelectedVideo(null);
          }}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.kind === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default Scheduler;

