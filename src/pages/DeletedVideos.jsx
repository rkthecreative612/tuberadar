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

const TOPIC_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4'];

function DeletedVideos() {
  const [deletedVideos, setDeletedVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

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

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: COLORS.bgMain, padding: '22px', boxSizing: 'border-box', color: COLORS.textPrimary, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Deleted Videos</h1>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px', fontStyle: 'italic' }}>
        Videos are automatically removed after 30 days
      </div>

      {loading && <div>Loading...</div>}

      {!loading && deletedVideos.length === 0 && (
        <div style={{ color: COLORS.textSecondary, padding: '40px 20px', textAlign: 'center' }}>
          No deleted videos
        </div>
      )}

      {!loading && deletedVideos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '900px' }}>
          {deletedVideos.map(v => {
            const daysLeft = getDaysLeft(v.deleted_at);
            return (
              <div
                key={v.id}
                style={{
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.borderDefault}`,
                  borderLeft: `4px solid ${getTopicColor(v.topic_id)}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.bgCard}
              >
                {/* Topic Dot */}
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getTopicColor(v.topic_id), flexShrink: 0 }} />
                
                {/* Video Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {v.video_title} 
                      {v.cancellation_reason && <span style={{ fontWeight: 'normal', color: COLORS.textSecondary, fontSize: '11px', fontStyle: 'italic' }}>({v.cancellation_reason})</span>}
                      {v.is_completed && (
                        <div 
                          className="completion-badge" 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            border: `1px solid ${COLORS.accentGreen}`, 
                            color: COLORS.accentGreen, 
                            fontSize: '10px', 
                            cursor: 'help' 
                          }}
                          title="video is completed"
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>{getTopicName(v.topic_id)}</div>
                  </div>
                </div>

                {/* Days Left Badge */}
                <div style={{ fontSize: '12px', color: daysLeft <= 7 ? COLORS.accentRed : COLORS.textSecondary, fontWeight: '600', minWidth: '80px', textAlign: 'right' }}>
                  {daysLeft === 0 ? '0 days' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleRestore(v.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: COLORS.accentGreen,
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeleteForever(v.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: COLORS.accentRed,
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Delete Forever
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
