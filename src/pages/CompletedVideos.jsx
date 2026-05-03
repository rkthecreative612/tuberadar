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

  const handleRemove = async (videoId) => {
    if (!window.confirm('Are you sure you want to remove from completed page? It will go to Deleted Videos.')) return;
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

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: COLORS.bgMain, padding: '22px', boxSizing: 'border-box', color: COLORS.textPrimary, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '20px' }}>Completed Videos</h1>

      {loading && <div>Loading...</div>}

      {!loading && completedVideos.length === 0 && (
        <div style={{ color: COLORS.textSecondary, padding: '40px 20px', textAlign: 'center' }}>
          No completed videos yet.
        </div>
      )}

      {!loading && completedVideos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '1000px' }}>
          {completedVideos.map(v => (
            <div
              key={v.id}
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.borderDefault}`,
                borderLeft: `4px solid ${getTopicColor(v.topic_id)}`,
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => setSelectedVideo(v)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#222'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.bgCard}
            >
              {/* Topic Dot */}
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getTopicColor(v.topic_id), flexShrink: 0 }} />
              
              {/* Video Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.video_title}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>{getTopicName(v.topic_id)}</div>
              </div>

              {/* Dates */}
              <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: COLORS.textSecondary, minWidth: '300px', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Date Added:</span>
                  <span style={{ color: '#aaa' }}>{formatDate(v.original_added_at || v.created_at)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.accentGreen, textTransform: 'uppercase' }}>Date Completed:</span>
                  <span style={{ color: COLORS.accentGreen }}>{formatDate(v.completed_at)}</span>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(v.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textSecondary,
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Remove from completed"
                onMouseEnter={e => e.currentTarget.style.color = COLORS.accentRed}
                onMouseLeave={e => e.currentTarget.style.color = COLORS.textSecondary}
              >
                ×
              </button>
            </div>
          ))}
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
    </div>
  );
}

export default CompletedVideos;
