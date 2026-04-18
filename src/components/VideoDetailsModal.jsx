import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const COLORS = {
  bgModal: '#111111',
  bgOverlay: 'rgba(0, 0, 0, 0.75)',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  border: '#333333',
  danger: '#ef4444',
  success: '#22c55e',
  buttonBg: '#222222',
  buttonHover: '#333333',
  inputBg: '#1a1a1a',
};

const VideoDetailsModal = ({ video, topicName, topicColor, onClose, onDeleteSuccess, onUpdateSuccess }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(video);
  const [editData, setEditData] = useState({
    title: video.video_title || '',
    description: video.video_description || '',
    notes: video.notes || '',
    date: video.created_at ? new Date(video.created_at).toISOString().split('T')[0] : '',
    time: video.scheduled_time || '',
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!video) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEditClick = () => {
    setEditData({
      title: currentVideo.video_title || '',
      description: currentVideo.video_description || '',
      notes: currentVideo.notes || '',
      date: currentVideo.created_at ? new Date(currentVideo.created_at).toISOString().split('T')[0] : '',
      time: currentVideo.scheduled_time || '',
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const [y, m, d] = editData.date.split('-').map(Number);
      const newDateObj = new Date(y, m - 1, d, 0, 0, 0, 0);
      const targetISO = newDateObj.toISOString();

      const updateObj = {
        video_title: editData.title,
        video_description: editData.description,
        notes: editData.notes,
        created_at: targetISO,
        scheduled_time: editData.time || null,
      };

      const { error } = await supabase
        .from('planner_videos')
        .update(updateObj)
        .eq('id', video.id);
      
      if (error) throw error;

      const updatedVideo = { 
        ...currentVideo, 
        ...updateObj,
        created_at: targetISO,
      };
      
      setCurrentVideo(updatedVideo);
      setToast('✅ Video updated');
      setIsEditMode(false);
      
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedVideo);
      }
    } catch (err) {
      console.error('Error updating video:', err);
      alert('Failed to update video: ' + err.message);
    } finally {
      setIsSaving(false);
    }
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
    scrollbarColor: '#444 #0f0f0f',
    scrollbarWidth: 'thin',
  };

  const headerStyle = {
    padding: '16px 20px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyle = {
    padding: '24px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  const footerStyle = {
    padding: '16px 20px',
    borderTop: `1px solid ${COLORS.border}`,
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const buttonBase = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'all 0.2s',
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '6px',
    padding: '12px 8px',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const pickerInputStyle = {
    ...inputStyle,
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 12px',
  };

  const textareaStyle = {
    ...inputStyle,
    fontSize: '14px',
    padding: '8px',
    resize: 'none',
    minHeight: '80px',
    lineHeight: '1.5',
    overflow: 'hidden',
  };

  const readOnlyStyle = {
    opacity: 0.6,
    color: '#aaa',
    cursor: 'not-allowed',
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
    fontSize: '13px',
  };

  const formatDisplayDate = (dateISO, timeStr) => {
    const d = new Date(dateISO);
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const datePart = d.toLocaleDateString('en-US', dateOptions);
    
    if (!timeStr) return datePart;

    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const displayM = String(m).padStart(2, '0');
    
    return `${datePart}, ${displayH}:${displayM} ${ampm}`;
  };

  const handleAutoExpand = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div style={modalStyle} onClick={handleBackdropClick}>
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f0f0f; }
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }

        /* Style native pickers */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        /* Picker popups - Note: largely browser controlled, but we can set color-scheme */
        input[type="date"], input[type="time"] {
          color-scheme: dark;
          accent-color: #ef4444;
        }
      `}</style>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Video Details</h3>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: topicColor, fontSize: '24px', lineHeight: 1 }}>●</span>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#ffffff',
                lineHeight: '1.2'
              }}>
                {currentVideo.video_title}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', marginLeft: '24px' }}>
              {topicName}
            </div>
          </div>

          {isEditMode ? (
            <>
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Title</div>
                <input 
                  autoFocus
                  maxLength={100}
                  style={inputStyle}
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
                <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'right', marginTop: '4px' }}>
                  {editData.title.length}/100
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Description</div>
                <textarea 
                  style={textareaStyle}
                  onInput={handleAutoExpand}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value.slice(0, 5000) })}
                  placeholder="Enter video description..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Scheduled Date</div>
                  <input 
                    type="date"
                    style={pickerInputStyle}
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Time (Optional)</div>
                  <input 
                    type="time"
                    style={{
                      ...pickerInputStyle,
                      color: editData.time ? '#ffffff' : '#777777'
                    }}
                    value={editData.time || ''}
                    onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Description</div>
              <div style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {currentVideo.video_description || 'No description provided.'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {!isEditMode && (
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Scheduled Date (Read-only)</div>
                <div style={readOnlyStyle}>{formatDisplayDate(currentVideo.created_at, currentVideo.scheduled_time)}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Status (Read-only)</div>
              <div style={{ 
                fontSize: '11px', 
                backgroundColor: '#222', 
                color: '#aaa', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                display: 'inline-block',
                cursor: 'not-allowed',
                border: '1px solid #333'
              }}>{currentVideo.status || 'Planned'}</div>
            </div>
          </div>

          {!isEditMode && currentVideo.binded_videos?.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Binded Videos</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {currentVideo.binded_videos.map((bv, idx) => (
                  <img 
                    key={idx} 
                    src={bv.thumbnail} 
                    style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: `1px solid ${COLORS.border}`, transition: 'transform 0.2s' }}
                    alt="Binded thumb"
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    title={bv.video_title}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Notes</div>
            {isEditMode ? (
              <textarea 
                style={textareaStyle}
                onInput={handleAutoExpand}
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value.slice(0, 5000) })}
                placeholder="Personal notes..."
              />
            ) : (
              <div style={{ 
                fontSize: '14px', 
                color: '#aaa', 
                fontStyle: 'italic', 
                padding: '12px', 
                backgroundColor: '#1a1a1a', 
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`,
                lineHeight: '1.5'
              }}>
                {currentVideo.notes || 'No notes.'}
              </div>
            )}
          </div>
        </div>

        <div style={footerStyle}>
          {isEditMode ? (
            <>
              <button 
                onClick={handleCancelEdit}
                style={{ ...buttonBase, backgroundColor: '#333', color: '#fff' }}
              >Cancel</button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving || !editData.date}
                style={{ ...buttonBase, backgroundColor: COLORS.success, color: '#000' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleEditClick}
                style={{ ...buttonBase, backgroundColor: COLORS.buttonBg, color: '#fff' }}
              >Edit</button>
              <button 
                onClick={() => setShowConfirm(true)}
                style={{ ...buttonBase, backgroundColor: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.danger}` }}
              >Delete</button>
            </>
          )}
        </div>

        {toast && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: COLORS.success,
            color: '#000',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {toast}
          </div>
        )}

        {showConfirm && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            zIndex: 20,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Delete Video?</div>
            <div style={{ color: COLORS.textSecondary, fontSize: '14px', marginBottom: '32px', lineHeight: '1.6' }}>
              This video will be permanently removed from your content planner. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{ ...buttonBase, backgroundColor: '#333', color: '#fff' }}
              >Keep it</button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ ...buttonBase, backgroundColor: COLORS.danger, color: '#fff' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Content'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetailsModal;
