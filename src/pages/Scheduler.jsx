import React, { useEffect, useState, useMemo, useRef } from 'react';
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

// Convert any date to local YYYY-MM-DD string (ignore timezone)
const getLocalDateString = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Convert YYYY-MM-DD string back to Date object at local midnight
const dateStringToDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Using 12:00 PM (noon) instead of midnight to safely handle timezone shifts
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const TOPIC_COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

const Scheduler = () => {
  const now = new Date();
  const [viewType, setViewType] = useState('calendar'); // 'calendar' or 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [statusColumns, setStatusColumns] = useState([]);
  const [openStatusId, setOpenStatusId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    topic_id: '',
    description: '',
    bindedLinks: '',
    notes: '',
  });
  const [addErrors, setAddErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const dateInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchStatusColumns();
  }, []);

  const handleSaveNewVideo = async (selectedDate) => {
    if (!selectedDate) return;
    setIsSaving(true);

    try {
      const topic = channels.find(c => c.id === addForm.topic_id);
      // Use helper to ensure local midnight
      const targetDate = dateStringToDate(selectedDate);
      const targetISO = targetDate.toISOString();

      // Process binded videos
      const binded = addForm.bindedLinks.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(link => {
          let id = null;
          try {
            const u = new URL(link);
            if (u.hostname === 'youtu.be') id = u.pathname.replace('/', '');
            else if (u.hostname.endsWith('youtube.com')) id = u.searchParams.get('v');
          } catch {
            if (/^[a-zA-Z0-9_-]{8,20}$/.test(link)) id = link;
          }
          return {
            video_id: id,
            video_link: id ? `https://www.youtube.com/watch?v=${id}` : link,
            thumbnail: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '',
          };
        });

      const payload = {
        video_title: addForm.title,
        video_description: addForm.description,
        topic_id: addForm.topic_id,
        notes: addForm.notes,
        binded_videos: binded,
        status: 'scheduled',
        video_status: 'none',
        created_at: targetISO,
        scheduled_time: targetISO,
        is_completed: false,
        is_deleted: false,
      };

      const { data, error } = await supabase
        .from('planner_videos')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      const newVideo = {
        ...data,
        topic_name: topic?.name || 'Unknown'
      };

      setVideos(prev => [...prev, newVideo]);
      setShowAddModal(false);
      setAddForm({ title: '', topic_id: '', description: '', bindedLinks: '', notes: '' });
      setToast({ text: '✅ Video scheduled successfully', kind: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Error scheduling video:', err);
      setToast({ text: 'Failed to schedule video', kind: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVideoClick = () => {
    const errors = {};
    if (!addForm.title.trim()) errors.title = 'Title is required';
    if (!addForm.topic_id) errors.topic = 'Topic is required';

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }
    setAddErrors({});
    dateInputRef.current.showPicker();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openStatusId && !e.target.closest('.status-dropdown-container')) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusId]);

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
        .eq('is_deleted', false)
        .eq('status', 'scheduled');

      if (videosError) throw videosError;

      const normalizedVideos = (videosData || []).map(video => ({
        ...video,
        created_at: video.created_at && !video.created_at.includes('Z')
          ? `${video.created_at}Z`
          : video.created_at
      }));

      setVideos(normalizedVideos);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('status_columns')
        .select('*')
        .eq('workspace_id', 'default')
        .eq('is_deleted', false)
        .order('position', { ascending: true });
      if (error) throw error;
      setStatusColumns(data || []);
    } catch (err) {
      console.error('Error fetching status columns:', err);
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
    return result.map(v => ({
      ...v,
      topic_name: channels.find(c => c.id === v.topic_id)?.name || 'Unknown'
    }));
  }, [videos, activeFilters, channels]);

  const sortedVideosForList = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    return filteredVideos
      .filter(v => {
        const d = new Date(v.created_at);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [filteredVideos, currentMonth]);

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

  const onDeleteSuccess = (deletedId, message = 'Video deleted') => {
    setVideos(prev => prev.filter(v => v.id !== deletedId));
    setToast({ text: `✅ ${message}`, kind: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const onMoveVideo = async (videoId, newDateStr) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const originalDateStr = getLocalDateString(video.created_at);
    if (originalDateStr === newDateStr) return;

    const targetDateObj = dateStringToDate(newDateStr);
    const targetISO = targetDateObj.toISOString();

    const originalISOValue = video.created_at;
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, created_at: targetISO } : v));

    try {
      const { error } = await supabase
        .from('planner_videos')
        .update({ created_at: targetISO })
        .eq('id', videoId);

      if (error) throw error;

      setToast({ text: `✅ Video moved to ${newDateStr}`, kind: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Drag error:', err);
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, created_at: originalISOValue } : v));
      setToast({ text: 'Failed to move video.', kind: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStatusChange = async (video, statusCol) => {
    let updates = { video_status: statusCol.column_key };
    let shouldRemove = false;

    // Special logic for moving between sections
    if (statusCol.column_key === 'thinking' || statusCol.column_key === 'planning') {
      updates = { status: 'planning', is_completed: false, video_status: statusCol.column_key };
      shouldRemove = true;
    } else if (statusCol.column_key === 'cancelled' || statusCol.column_key === 'canceled') {
      updates = { is_deleted: true, video_status: statusCol.column_key };
      shouldRemove = true;
    } else if (statusCol.column_key === 'ongoing') {
      updates = { status: 'ongoing', is_completed: false, video_status: statusCol.column_key };
      shouldRemove = true;
    } else if (statusCol.column_key === 'completed' || statusCol.column_key === 'live') {
      updates = { is_completed: true, video_status: statusCol.column_key };
    } else {
      // Default scheduled
      updates = { status: 'scheduled', is_completed: false, is_deleted: false, video_status: statusCol.column_key };
    }

    setOpenStatusId(null);
    try {
      const { error } = await supabase
        .from('planner_videos')
        .update(updates)
        .eq('id', video.id);

      if (error) throw error;

      if (shouldRemove) {
        setVideos(prev => prev.filter(v => v.id !== video.id));
      } else {
        setVideos(prev => prev.map(v => v.id === video.id ? { ...v, ...updates } : v));
      }

      setToast({ text: `✅ Status updated to ${statusCol.column_name}`, kind: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Status update error:', err);
      setToast({ text: 'Failed to update status', kind: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const formatDateList = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const month = d.toLocaleString('default', { month: 'short' });
    return `${month} ${d.getDate()}${isToday ? ' (Today)' : ''}`;
  };

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: COLORS.bgMain,
    color: COLORS.textPrimary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
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
    overflow: 'hidden',
  };

  const contentContainerStyle = {
    flex: 1,
    padding: '24px',
    overflowY: viewType === 'list' ? 'auto' : 'hidden',
    overflowX: 'hidden',
    transition: 'all 0.3s ease',
  };

  const rightSidebarStyle = {
    width: '240px',
    borderLeft: `1px solid ${COLORS.border}`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#0a0a0a',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const viewButtonStyle = (active) => ({
    padding: '8px 20px',
    backgroundColor: active ? '#222' : 'transparent',
    color: active ? '#fff' : COLORS.textSecondary,
    border: `1px solid ${active ? '#444' : 'transparent'}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: active ? 'default' : 'pointer',
    transition: 'all 0.2s ease',
  });

  const monthStr = currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' });

  return (
    <div style={pageStyle}>
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0f0f0f; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; border: 2px solid #0f0f0f; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }

        .list-row { transition: all 0.2s; cursor: pointer; border-bottom: 1px solid #1a1a1a; }
        .list-row:hover { background-color: rgba(255,255,255,0.02); }
        .list-header { border-bottom: 2px solid #333; }
        .list-header th { text-align: left; padding: 16px; font-size: 11px; color: #666; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
        .list-cell { padding: 20px 16px; font-size: 14px; position: relative; }
        
        .status-dropdown-container { position: relative; }
        .status-trigger {
          background: #111;
          color: white;
          border: 1px solid #333;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 130px;
          justify-content: space-between;
        }
        .status-trigger:hover { background: #1a1a1a; border-color: #444; }
        .status-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: #111;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 4px;
          z-index: 1000;
          width: 180px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          color: #ccc;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .status-item:hover { background: #222; color: #fff; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.5);
          cursor: pointer;
        }
      `}</style>

      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>Tasks</h2>
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#161616', padding: '4px', borderRadius: '10px' }}>
            <button onClick={() => setViewType('calendar')} style={viewButtonStyle(viewType === 'calendar')}>Calendar</button>
            <button onClick={() => setViewType('list')} style={viewButtonStyle(viewType === 'list')}>List</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              marginRight: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f87171'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            <span style={{ fontSize: '16px' }}>+</span> Add Video
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161616', padding: '4px', borderRadius: '10px' }}>
            <button 
              onClick={handlePrevMonth}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: '14px', fontWeight: 'bold' }}
            >←</button>
            <div style={{ fontSize: '14px', fontWeight: '900', minWidth: '90px', textAlign: 'center', letterSpacing: '0.02em' }}>{monthStr}</div>
            <button 
              onClick={handleNextMonth}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: '14px', fontWeight: 'bold' }}
            >→</button>
          </div>
        </div>
      </div>

      <div style={mainContentStyle}>
        <div style={contentContainerStyle}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: COLORS.textSecondary }}>Loading...</div>
          ) : viewType === 'calendar' ? (
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
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead className="list-header">
                <tr>
                  <th style={{ width: '45%' }}>TITLE</th>
                  <th style={{ width: '20%' }}>DATE</th>
                  <th style={{ width: '20%' }}>CATEGORY</th>
                  <th style={{ width: '15%' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sortedVideosForList.map(video => {
                  const topicColor = topicColorMap[video.topic_id] || '#333';
                  const currentStatusCol = statusColumns.find(s => s.column_key === video.video_status) || { column_name: 'Scheduled', color: '#888' };

                  return (
                    <tr
                      key={video.id}
                      className="list-row"
                      style={{
                        borderLeft: `6px solid ${topicColor}`,
                        backgroundColor: `${topicColor}15`
                      }}
                      onClick={(e) => {
                        if (!e.target.closest('.status-dropdown-container')) {
                          setSelectedVideo(video);
                          setShowModal(true);
                        }
                      }}
                    >
                      <td className="list-cell">
                        <span style={{ fontWeight: '900', color: '#fff', letterSpacing: '0.02em', fontSize: '15px' }}>{video.video_title}</span>
                      </td>
                      <td className="list-cell" style={{ color: formatDateList(video.created_at).includes('Today') ? '#3b82f6' : '#bbb', fontWeight: '800' }}>
                        {formatDateList(video.created_at)}
                      </td>
                      <td className="list-cell" style={{ color: topicColor, fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {video.topic_name}
                      </td>
                      <td className="list-cell">
                        <div className="status-dropdown-container">
                          <div
                            className="status-trigger"
                            onClick={(e) => { e.stopPropagation(); setOpenStatusId(openStatusId === video.id ? null : video.id); }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="status-dot" style={{ backgroundColor: currentStatusCol.color }}></div>
                              <span>{currentStatusCol.column_name}</span>
                            </div>
                            <span style={{ fontSize: '9px', opacity: 0.5 }}>▼</span>
                          </div>

                          {openStatusId === video.id && (
                            <div className="status-menu">
                              {statusColumns.map(s => (
                                <div
                                  key={s.column_key}
                                  className="status-item"
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(video, s); }}
                                >
                                  <div className="status-dot" style={{ backgroundColor: s.color }}></div>
                                  <span>{s.column_name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={rightSidebarStyle}>
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900' }}>FILTER BY TOPIC</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {channels.map(channel => {
                const isActive = activeFilters.has(channel.id) || activeFilters.size === 0;
                return (
                  <div
                    key={channel.id}
                    onClick={() => toggleFilter(channel.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: activeFilters.has(channel.id) ? '#111' : 'transparent',
                      border: `1px solid ${activeFilters.has(channel.id) ? '#222' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '1px',
                      backgroundColor: topicColorMap[channel.id],
                      opacity: isActive ? 1 : 0.2
                    }}></div>
                    <span style={{
                      fontSize: '12px',
                      color: isActive ? '#eee' : '#555',
                      fontWeight: activeFilters.has(channel.id) ? '800' : '500',
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

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#111',
            width: '100%', maxWidth: '500px',
            borderRadius: '16px', border: '1px solid #333',
            padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>Add New Video</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Title</div>
                <input
                  autoFocus
                  maxLength={100}
                  placeholder="Video Title..."
                  style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', border: `1px solid ${addErrors.title ? '#ef4444' : '#333'}`, borderRadius: '8px', padding: '12px', outline: 'none' }}
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>{addErrors.title}</span>
                  <span style={{ color: '#555', fontSize: '11px' }}>{addForm.title.length}/100</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Topic / Category</div>
                <select
                  style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#fff', border: `1px solid ${addErrors.topic ? '#ef4444' : '#333'}`, borderRadius: '8px', padding: '12px', outline: 'none' }}
                  value={addForm.topic_id}
                  onChange={(e) => setAddForm({ ...addForm, topic_id: e.target.value })}
                >
                  <option value="">Select Topic...</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {addErrors.topic && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{addErrors.topic}</div>}
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Description</div>
                <textarea
                  placeholder="Brief description..."
                  style={{ width: '100%', height: '80px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '12px', outline: 'none', resize: 'none' }}
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Binded Links (One per line)</div>
                  <textarea
                    placeholder="https://youtube.com/..."
                    style={{ width: '100%', height: '60px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '10px', outline: 'none', resize: 'none', fontSize: '12px' }}
                    value={addForm.bindedLinks}
                    onChange={(e) => setAddForm({ ...addForm, bindedLinks: e.target.value })}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Notes</div>
                  <textarea
                    placeholder="Internal notes..."
                    style={{ width: '100%', height: '60px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '10px', outline: 'none', resize: 'none', fontSize: '12px' }}
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleAddVideoClick}
                disabled={isSaving}
                style={{ padding: '10px 24px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}
              >
                {isSaving ? 'Scheduling...' : 'Schedule'}
              </button>
              <input
                type="date"
                ref={dateInputRef}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', colorScheme: 'dark' }}
                onChange={(e) => handleSaveNewVideo(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {showModal && selectedVideo && (
        <VideoDetailsModal
          video={selectedVideo}
          topicName={channels.find(c => c.id === selectedVideo.topic_id)?.name || 'Unknown'}
          topicColor={topicColorMap[selectedVideo.topic_id]}
          onClose={() => {
            setShowModal(false);
            setSelectedVideo(null);
          }}
          onDeleteSuccess={onDeleteSuccess}
          onUpdateSuccess={(updatedVideo) => {
            setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
            setSelectedVideo(updatedVideo);
            setToast({ text: '✅ Video updated', kind: 'success' });
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.kind === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff',
          padding: '14px 28px',
          borderRadius: '10px',
          fontWeight: '900',
          fontSize: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 2000,
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default Scheduler;

