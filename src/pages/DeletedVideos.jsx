import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

const COLORS = {
  bgMain: '#0f0f0f',
  bgCard: '#1a1a1a',
  borderDefault: '#333',
  textPrimary: '#fff',
  textSecondary: '#888',
  accentRed: '#ef4444',
  accentGreen: '#22c55e',
};

const TOPIC_COLORS = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4',
  '#ec4899', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e', '#14b8a6'
];

function DeletedVideos() {
  const [deletedVideos, setDeletedVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const hexToRgba = (hex, alpha = 1) => {
    // Supports formats like "#RRGGBB" and gracefully falls back to gray.
    const normalized = (hex || '').toString().trim();
    const m = normalized.match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return `rgba(136, 136, 136, ${alpha})`;
    const intVal = parseInt(m[1], 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    async function load() {
      try {
        const { data: videos } = await supabase
          .from('planner_videos')
          .select('*')
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });

        const { data: topicsData } = await supabase
          .from('my_channels')
          .select('*');

        setDeletedVideos(videos || []);
        setTopics(topicsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getTopicColor = (topicId) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic && topic.color) return topic.color;
    const index = topics.findIndex(t => t.id === topicId);
    return index >= 0 ? TOPIC_COLORS[index % TOPIC_COLORS.length] : '#888';
  };

  const getTopicName = (topicId) => {
    return topics.find(t => t.id === topicId)?.name || 'Unknown';
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 30;
    let deleted = new Date(deletedAt);
    if (isNaN(deleted.getTime()) && !deletedAt.includes('Z') && !deletedAt.includes('+')) {
      deleted = new Date(deletedAt + 'Z');
    }
    if (isNaN(deleted.getTime())) return 0;
    const now = new Date();
    const daysElapsed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 30 - daysElapsed);
    return daysLeft;
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRestore = async (videoId) => {
    try {
      // Get the video to know which topic it belongs to
      const video = deletedVideos.find(v => v.id === videoId);
      if (!video) return;

      // Restore: set is_deleted to false, status back to 'planning', video_status to 'none'
      await supabase
        .from('planner_videos')
        .update({ 
          is_deleted: false, 
          deleted_at: null,
          status: 'planning',
          video_status: 'none'
        })
        .eq('id', videoId);
      
      setDeletedVideos(prev => prev.filter(v => v.id !== videoId));
      showToast('✅ Restored to Planner');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to restore');
    }
  };

  const handleDeleteForever = async (videoId) => {
    if (!window.confirm('Permanently delete this video?')) return;
    try {
      await supabase
        .from('planner_videos')
        .delete()
        .eq('id', videoId);
      
      setDeletedVideos(prev => prev.filter(v => v.id !== videoId));
      showToast('✅ Permanently deleted');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to delete');
    }
  };

  const proHeadingStyle = {
    fontSize: '42px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#fff',
    margin: 0,
    marginBottom: '8px',
    fontFamily: '"Inter", system-ui, sans-serif',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: COLORS.bgMain, padding: '32px 28px', boxSizing: 'border-box', color: COLORS.textPrimary, fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ width: '100%', marginBottom: '28px' }}>
        <h1 style={proHeadingStyle}>Trash</h1>
        <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
          Videos are automatically removed after 30 days
        </div>
      </div>

      {loading && <div style={{ color: COLORS.textSecondary }}>Loading...</div>}

      {!loading && deletedVideos.length === 0 && (
        <div style={{
          color: COLORS.textSecondary,
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: COLORS.bgCard,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          No deleted videos
        </div>
      )}

      {!loading && deletedVideos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {deletedVideos.map(v => {
            const daysLeft = getDaysLeft(v.deleted_at);
            const topicColor = getTopicColor(v.topic_id);
            const hoverGlow = `0 8px 32px ${hexToRgba(topicColor, 0.18)}`;
            return (
              <div
                key={v.id}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'linear-gradient(145deg, #1a1a1a 0%, #121212 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = hoverGlow;
                  e.currentTarget.style.borderColor = `${hexToRgba(topicColor, 0.35)}`;

                  const dot = e.currentTarget.querySelector('.deleted-topic-dot');
                  if (dot) {
                    dot.style.boxShadow = `0 0 0 4px ${hexToRgba(topicColor, 0.15)}, 0 0 20px ${hexToRgba(topicColor, 0.4)}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';

                  const dot = e.currentTarget.querySelector('.deleted-topic-dot');
                  if (dot) {
                    dot.style.boxShadow = 'none';
                  }
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: topicColor,
                    flexShrink: 0,
                    boxShadow: 'none',
                  }}
                  className="deleted-topic-dot"
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    {v.video_title}
                    {v.cancellation_reason && (
                      <span style={{ fontWeight: 500, color: COLORS.textSecondary, fontSize: '12px', fontStyle: 'italic' }}>
                        ({v.cancellation_reason})
                      </span>
                    )}
                    {v.is_completed && (
                      <div
                        className="completion-badge"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `1px solid ${COLORS.accentGreen}`,
                          color: COLORS.accentGreen,
                          fontSize: '10px',
                          cursor: 'help',
                        }}
                        title="video is completed"
                      >
                        ✓
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: topicColor, marginTop: '6px', fontWeight: 600, letterSpacing: '0.02em' }}>
                    {getTopicName(v.topic_id)}
                  </div>
                </div>

                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: daysLeft <= 7 ? COLORS.accentRed : COLORS.textSecondary,
                  minWidth: '100px',
                  textAlign: 'center',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: daysLeft <= 7 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${daysLeft <= 7 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleRestore(v.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: `1px solid ${COLORS.accentGreen}44`,
                      backgroundColor: `${COLORS.accentGreen}18`,
                      color: COLORS.accentGreen,
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${COLORS.accentGreen}30`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${COLORS.accentGreen}18`; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    RESTORE
                  </button>
                  <button
                    onClick={() => handleDeleteForever(v.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: `1px solid ${COLORS.accentRed}44`,
                      backgroundColor: `${COLORS.accentRed}18`,
                      color: COLORS.accentRed,
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${COLORS.accentRed}30`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${COLORS.accentRed}18`; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    DELETE FOREVER
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px', borderRadius: '8px', backgroundColor: COLORS.accentGreen, color: '#fff', fontWeight: '700', zIndex: 3000 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default DeletedVideos;
