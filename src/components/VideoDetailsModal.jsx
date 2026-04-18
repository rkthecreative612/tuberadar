import React, { useState } from 'react';
import supabase from '../lib/supabase';

const COLORS = {
  bgModal: '#111111',
  bgOverlay: 'rgba(0, 0, 0, 0.75)',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  border: '#333333',
  danger: '#ef4444',
  buttonBg: '#222222',
  buttonHover: '#333333',
};

const VideoDetailsModal = ({ video, topicName, topicColor, onClose, onDeleteSuccess }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!video) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('planner_videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;
      onDeleteSuccess(video.id);
      onClose();
    } catch (err) {
      console.error('Error deleting video:', err);
      alert('Failed to delete video: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: COLORS.bgOverlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  };

  const contentStyle = {
    backgroundColor: COLORS.bgModal,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  };

  const headerStyle = {
    padding: '16px 20px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyle = {
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const footerStyle = {
    padding: '16px 20px',
    borderTop: `1px solid ${COLORS.border}`,
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const buttonBase = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'opacity 0.2s',
  };

  const thumbnail = video.binded_videos?.[0]?.thumbnail || '';
  const dateStr = new Date(video.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div style={modalStyle} onClick={handleBackdropClick}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Video Details</h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: COLORS.textSecondary, 
              fontSize: '24px', 
              cursor: 'pointer',
              lineHeight: 1
            }}
          >×</button>
        </div>

        <div style={bodyStyle}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <img 
              src={thumbnail || 'https://via.placeholder.com/120x68?text=No+Thumb'} 
              style={{ width: '120px', height: '68px', borderRadius: '4px', objectFit: 'cover', backgroundColor: '#222' }} 
              alt="Thumbnail"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: COLORS.textPrimary }}>{video.video_title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: topicColor }}></span>
                <span style={{ fontSize: '12px', color: COLORS.textSecondary }}>{topicName}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Scheduled Date</div>
              <div style={{ fontSize: '13px' }}>{dateStr}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
              <div style={{ 
                fontSize: '11px', 
                backgroundColor: '#333', 
                color: '#aaa', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                display: 'inline-block' 
              }}>Planned</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Description</div>
            <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {video.video_description || 'No description provided.'}
            </div>
          </div>

          {video.binded_videos?.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Binded Videos</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {video.binded_videos.map((bv, idx) => (
                  <img 
                    key={idx} 
                    src={bv.thumbnail} 
                    style={{ width: '60px', height: '34px', borderRadius: '4px', objectFit: 'cover', border: `1px solid ${COLORS.border}` }}
                    alt="Binded thumb"
                    title={bv.video_title}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Notes</div>
            <div style={{ 
              fontSize: '13px', 
              color: '#aaa', 
              fontStyle: 'italic', 
              padding: '10px', 
              backgroundColor: '#1a1a1a', 
              borderRadius: '6px',
              border: `1px solid ${COLORS.border}`
            }}>
              {video.notes || 'No notes.'}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button 
            disabled 
            style={{ ...buttonBase, backgroundColor: '#333', color: '#666', cursor: 'not-allowed' }}
          >Edit</button>
          <button 
            disabled 
            style={{ ...buttonBase, backgroundColor: '#333', color: '#666', cursor: 'not-allowed' }}
          >Reschedule</button>
          <button 
            onClick={() => setShowConfirm(true)}
            style={{ ...buttonBase, backgroundColor: COLORS.danger, color: '#fff' }}
          >Delete</button>
        </div>

        {showConfirm && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            zIndex: 10
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Are you sure?</div>
            <div style={{ color: COLORS.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
              This video will be permanently deleted from the planner.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{ ...buttonBase, backgroundColor: '#444', color: '#fff' }}
              >Cancel</button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ ...buttonBase, backgroundColor: COLORS.danger, color: '#fff' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetailsModal;
