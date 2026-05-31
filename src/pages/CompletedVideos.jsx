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
  modalBg: '#111',
};

const TOPIC_COLORS = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4',
  '#ec4899', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e', '#14b8a6'
];

function CompletedVideos() {
  const [completedVideos, setCompletedVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, videoId: null, busy: false });

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
          .eq('is_completed', true)
          .eq('is_deleted', false)
          .order('completed_at', { ascending: false });

        const { data: topicsData } = await supabase
          .from('my_channels')
          .select('*');

        setCompletedVideos(videos || []);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    let d = new Date(dateString);
    if (isNaN(d.getTime()) && !dateString.includes('Z') && !dateString.includes('+')) {
      d = new Date(dateString + 'Z');
    }
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const openRemoveConfirm = (videoId) => {
    setConfirmModal({ open: true, type: 'single', videoId, busy: false });
  };

  const openDeleteAllConfirm = () => {
    setConfirmModal({ open: true, type: 'all', videoId: null, busy: false });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, type: null, videoId: null, busy: false });
  };

  const handleRemove = async (videoId) => {
    try {
      await supabase
        .from('planner_videos')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', videoId);
      
      setCompletedVideos(prev => prev.filter(v => v.id !== videoId));
      showToast('✅ Moved to Deleted Videos');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to remove');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const deletedAt = new Date().toISOString();
      await supabase
        .from('planner_videos')
        .update({ is_deleted: true, deleted_at: deletedAt })
        .eq('is_completed', true)
        .eq('is_deleted', false);

      setCompletedVideos([]);
      showToast('✅ Moved all to Deleted Videos');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to delete all');
    }
  };

  const handleConfirm = async () => {
    if (!confirmModal.open || confirmModal.busy) return;
    setConfirmModal(prev => ({ ...prev, busy: true }));

    if (confirmModal.type === 'single' && confirmModal.videoId) {
      await handleRemove(confirmModal.videoId);
    } else if (confirmModal.type === 'all') {
      await handleDeleteAll();
    }

    closeConfirm();
  };

  const proHeadingStyle = {
    fontSize: '42px',
    fontWeight: 900,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: '0.15em',
    color: '#fff',
    margin: 0,
    fontFamily: '"Inter", system-ui, sans-serif',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: COLORS.bgMain, padding: '32px 28px', boxSizing: 'border-box', color: COLORS.textPrimary, fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', width: '100%' }}>
        <div>
          <h1 style={{ ...proHeadingStyle, textAlign: 'left' }}>Published</h1>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
            {completedVideos.length} completed video{completedVideos.length !== 1 ? 's' : ''}
          </div>
        </div>

        <button
          onClick={openDeleteAllConfirm}
          disabled={loading || completedVideos.length === 0}
          style={{
            padding: '11px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(80, 0, 0, 0.12) 100%)',
            color: '#fff',
            cursor: loading || completedVideos.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.06em',
            opacity: loading || completedVideos.length === 0 ? 0.4 : 1,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.12)';
          }}
        >
          DELETE ALL
        </button>
      </div>

      {loading && <div style={{ color: COLORS.textSecondary }}>Loading...</div>}

      {!loading && completedVideos.length === 0 && (
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
          No completed videos yet.
        </div>
      )}

      {!loading && completedVideos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {completedVideos.map((v) => {
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
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onClick={() => setSelectedVideo(v)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = hoverGlow;
                  e.currentTarget.style.borderColor = `${hexToRgba(topicColor, 0.35)}`;
                  const dot = e.currentTarget.querySelector('.completed-topic-dot');
                  if (dot) {
                    dot.style.boxShadow = `0 0 0 4px ${hexToRgba(topicColor, 0.15)}, 0 0 20px ${hexToRgba(topicColor, 0.4)}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  const dot = e.currentTarget.querySelector('.completed-topic-dot');
                  if (dot) {
                    dot.style.boxShadow = 'none';
                  }
                }}
              >
                <div
                  style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: topicColor, flexShrink: 0, boxShadow: 'none' }}
                  className="completed-topic-dot"
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
                    {v.video_title}
                  </div>
                  <div style={{ fontSize: '12px', color: topicColor, marginTop: '6px', fontWeight: 600, letterSpacing: '0.02em' }}>
                    {getTopicName(v.topic_id)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', fontSize: '12px', minWidth: '320px', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date Added</span>
                    <span style={{ color: '#aaa', fontWeight: 600 }}>{formatDate(v.original_added_at || v.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: COLORS.accentGreen, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed</span>
                    <span style={{ color: COLORS.accentGreen, fontWeight: 700 }}>{formatDate(v.completed_at)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openRemoveConfirm(v.id);
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: COLORS.textSecondary,
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                  title="Remove from completed"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = COLORS.accentRed;
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = COLORS.textSecondary;
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal (Read-only) */}
      {selectedVideo && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            style={{ backgroundColor: COLORS.modalBg, width: '90%', maxWidth: '500px', borderRadius: '12px', border: `1px solid ${COLORS.borderDefault}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getTopicColor(selectedVideo.topic_id) }} />
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{selectedVideo.video_title}</h2>
              </div>
              <button onClick={() => setSelectedVideo(null)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Topic</label>
              <div style={{ fontSize: '14px' }}>{getTopicName(selectedVideo.topic_id)}</div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Description</label>
              <div style={{ fontSize: '14px', color: '#ccc', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                {selectedVideo.video_description || 'No description provided.'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Notes</label>
              <div style={{ fontSize: '14px', color: '#ccc', fontStyle: 'italic', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
                {selectedVideo.notes || 'No notes.'}
              </div>
            </div>

            {selectedVideo.binded_videos?.length > 0 && (
              <div>
                <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Binded Videos</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedVideo.binded_videos.map((bv, i) => (
                    <img key={i} src={bv.thumbnail} title={bv.video_title} style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #333' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #333', paddingTop: '16px', display: 'flex', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Added</label>
                <div style={{ fontSize: '12px' }}>{formatDate(selectedVideo.original_added_at || selectedVideo.created_at)}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Completed</label>
                <div style={{ fontSize: '12px', color: COLORS.accentGreen }}>{formatDate(selectedVideo.completed_at)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px', borderRadius: '8px', backgroundColor: COLORS.accentGreen, color: '#fff', fontWeight: '700', zIndex: 3000 }}>
          {toast}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(6px)',
          }}
          onClick={closeConfirm}
        >
          <div
            style={{
              width: '92%',
              maxWidth: '520px',
              backgroundColor: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>
                  {confirmModal.type === 'all' ? 'Delete all completed videos?' : 'Remove from completed?'}
                </div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#999', lineHeight: 1.4 }}>
                  {confirmModal.type === 'all'
                    ? 'This will move every completed video to Deleted Videos.'
                    : 'This will move the video to Deleted Videos.'}
                </div>
              </div>

              <button
                onClick={closeConfirm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#777',
                  fontSize: '22px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '2px 6px',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={closeConfirm}
                disabled={confirmModal.busy}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  cursor: confirmModal.busy ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                  fontSize: '12px',
                  opacity: confirmModal.busy ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmModal.busy}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(239, 68, 68, 0.85)',
                  color: '#fff',
                  cursor: confirmModal.busy ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                  fontSize: '12px',
                  opacity: confirmModal.busy ? 0.7 : 1,
                }}
              >
                {confirmModal.busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompletedVideos;
