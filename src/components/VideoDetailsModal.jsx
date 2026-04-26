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
    date: video.scheduled_time ? new Date(video.scheduled_time).toISOString().split('T')[0] : '',
    time: video.scheduled_time ? new Date(video.scheduled_time).toISOString().split('T')[1].substring(0, 5) : '',
    binded_videos: video.binded_videos || [],
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusColumns, setStatusColumns] = useState([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchStatusColumns();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showStatusDropdown) setShowStatusDropdown(false);
        else onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toast, showStatusDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showStatusDropdown && !e.target.closest('.status-container')) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  const fetchStatusColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('status_columns')
        .select('column_name, column_key, color')
        .eq('workspace_id', 'default')
        .eq('is_deleted', false)
        .order('position', { ascending: true });
      if (error) throw error;
      setStatusColumns(data || []);
    } catch (err) {
      console.error('Error fetching status columns:', err);
    }
  };

  if (!video) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEditClick = () => {
    setEditData({
      title: currentVideo.video_title || '',
      description: currentVideo.video_description || '',
      notes: currentVideo.notes || '',
      date: currentVideo.scheduled_time ? new Date(currentVideo.scheduled_time).toISOString().split('T')[0] : '',
      time: currentVideo.scheduled_time ? new Date(currentVideo.scheduled_time).toISOString().split('T')[1].substring(0, 5) : '',
      binded_videos: currentVideo.binded_videos || [],
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const formatDateForInput = (dateISO) => {
    if (!dateISO) return '';
    return new Date(dateISO).toISOString().split('T')[0];
  };

  const hasChanges = () => {
    return (
      editData.title !== currentVideo.video_title ||
      editData.description !== (currentVideo.video_description || '') ||
      editData.notes !== (currentVideo.notes || '') ||
      editData.date !== formatDateForInput(currentVideo.scheduled_time) ||
      editData.time !== (currentVideo.scheduled_time ? new Date(currentVideo.scheduled_time).toISOString().split('T')[1].substring(0, 5) : '')
    );
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
        scheduled_time: targetISO,
        created_at: targetISO, // Sync created_at for Scheduler calendar positioning
        binded_videos: editData.binded_videos,
      };

      // If the video was created in Status (status_only), update it to 'scheduled'
      // so it appears in the Scheduler tab (calendar).
      if (currentVideo.status === 'status_only') {
        updateObj.status = 'scheduled';
      }

      const { error } = await supabase
        .from('planner_videos')
        .update(updateObj)
        .eq('id', video.id);
      
      if (error) throw error;

      const updatedVideo = { 
        ...currentVideo, 
        ...updateObj,
      };
      
      setCurrentVideo(updatedVideo);
      
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedVideo);
      }

      // Close modal completely after save as requested
      onClose();
    } catch (err) {
      console.error('Error updating video:', err);
      alert('Failed to update video: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsSaving(true);
    setShowStatusDropdown(false);
    try {
      const { error } = await supabase
        .from('planner_videos')
        .update({
          video_status: newStatus.column_key
        })
        .eq('id', video.id);

      if (error) throw error;

      if (newStatus.column_key === 'none') {
        setToast('✅ Status cleared');
      } else {
        setToast(`✅ Changed to ${newStatus.column_name}`);
      }
      
      const updatedVideo = { 
        ...currentVideo, 
        video_status: newStatus.column_key
      };
      setCurrentVideo(updatedVideo);

      // Notify parent to update local state without deleting from UI
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedVideo);
      }
    } catch (err) {
      console.error('Error changing status:', err);
      setToast('❌ Failed to change status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToPlanner = async () => {
    setIsSaving(true);
    try {
      const today = new Date();
      // Use local date to avoid timezone shift
      const targetISO = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const { error } = await supabase
        .from('planner_videos')
        .update({
          status: 'planning',
          created_at: targetISO,
          scheduled_time: null
        })
        .eq('id', video.id);

      if (error) throw error;

      // Notify parent to remove from Scheduler (since it's now 'planning')
      if (onDeleteSuccess) {
        onDeleteSuccess(video.id, 'Video moved to Planner');
      }
      onClose();
    } catch (err) {
      console.error('Error moving to planner:', err);
      alert('Failed to move to planner: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('planner_videos')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', video.id);


      if (error) throw error;
      onDeleteSuccess(video.id, 'Video deleted');
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
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
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

  const dateInputStyle = {
    background: '#1a1a1a',
    border: '1px solid #555',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
    colorScheme: 'dark'
  };

  const timeInputStyle = {
    background: '#1a1a1a',
    border: '1px solid #555',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
    colorScheme: 'dark'
  };

  const textareaStyle = {
    ...inputStyle,
    fontSize: '14px',
    padding: '8px 12px',
    resize: 'none',
    minHeight: '80px',
    maxHeight: '400px',
    lineHeight: '1.5',
    overflow: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
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

  const formatDisplayDate = (dateISO) => {
    if (!dateISO) return '';
    const d = new Date(dateISO.includes('Z') ? dateISO : dateISO + 'Z');
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleAutoExpand = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';
  };

  const handleTextareaFocus = (e) => {
    handleAutoExpand(e);
  };

  const handleTextareaChange = (e, fieldName) => {
    handleAutoExpand(e);
    setEditData({ ...editData, [fieldName]: e.target.value });
  };

  const handleTitleFocus = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  const handleTitleChange = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    setEditData({ ...editData, title: e.target.value });
  };

  return (
    <div style={modalStyle} onClick={handleBackdropClick}>
      <style>{`
        ::-webkit-scrollbar { width: 0; height: 0; }
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* Style native pickers */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.5);
          opacity: 1 !important;
          cursor: pointer;
        }

        /* Picker popups - Note: largely browser controlled, but we can set color-scheme */
        input[type="date"], input[type="time"] {
          color-scheme: dark;
          accent-color: #ef4444;
        }

        .date-input-custom:hover {
          border-color: #ff6666 !important;
        }

        .time-input-custom:hover {
          border-color: #60a5fa !important;
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
                <textarea 
                  autoFocus
                  maxLength={100}
                  style={{
                    ...inputStyle,
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: '1.4',
                    resize: 'none',
                    minHeight: '40px',
                    maxHeight: '100px',
                    overflow: 'hidden',
                  }}
                  value={editData.title}
                  onFocus={handleTitleFocus}
                  onChange={handleTitleChange}
                />
                <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'right', marginTop: '4px' }}>
                  {editData.title.length}/100
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Description</div>
                <textarea 
                  style={textareaStyle}
                  onFocus={handleTextareaFocus}
                  value={editData.description}
                  onChange={(e) => handleTextareaChange(e, 'description')}
                  placeholder="Enter video description..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Scheduled Date</div>
                  <input 
                    type="date"
                    className="date-input-custom"
                    style={dateInputStyle}
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Time (Optional)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="time"
                      className="time-input-custom"
                      style={timeInputStyle}
                      value={editData.time || ''}
                      onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, time: '00:00' })}
                      title="Reset to 00:00"
                      style={{
                        background: '#333',
                        border: 'none',
                        color: '#fff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Binded Videos in Edit Mode */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Binded Videos</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {editData.binded_videos && editData.binded_videos.map((bv, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '80px',
                        height: '45px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #555'
                      }}
                    >
                      <img
                        src={bv.thumbnail || 'https://via.placeholder.com/80x45?text=Video'}
                        alt="binded"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editData.binded_videos.filter((_, i) => i !== idx);
                          setEditData({ ...editData, binded_videos: updated });
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: '#ef4444',
                          border: 'none',
                          color: '#fff',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!editData.binded_videos || editData.binded_videos.length === 0) && (
                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No binded videos.</div>
                  )}
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
                <div style={readOnlyStyle}>{formatDisplayDate(currentVideo.created_at)}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Status</div>
              <div className="status-container" style={{ position: 'relative' }}>
                <div 
                  onClick={() => !isSaving && setShowStatusDropdown(!showStatusDropdown)}
                  style={{ 
                    fontSize: '11px', 
                    backgroundColor: '#222', 
                    color: '#fff', 
                    padding: '6px 12px', 
                    borderRadius: '12px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    border: '1px solid #444',
                    transition: 'background 0.2s',
                    width: 'fit-content',
                    minWidth: '140px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#222'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {statusColumns.find(s => s.column_key === currentVideo.video_status)?.color && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColumns.find(s => s.column_key === currentVideo.video_status).color }} />
                    )}
                    {statusColumns.find(s => s.column_key === currentVideo.video_status)?.column_name || (currentVideo.video_status === 'none' ? 'None' : (currentVideo.status || 'Planned'))}
                  </div>
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
                </div>

                {showStatusDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '4px',
                    zIndex: 2000,
                    width: '180px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}>
                    {statusColumns.length > 0 ? (
                      statusColumns.map(s => (
                        <div
                          key={s.column_key}
                          onClick={() => handleStatusChange(s)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                            <span style={{ color: '#fff', fontSize: '13px' }}>{s.column_name}</span>
                          </div>
                          {currentVideo.video_status === s.column_key && <span style={{ color: COLORS.success, fontSize: '12px' }}>✓</span>}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px', color: '#888', fontSize: '12px', textAlign: 'center' }}>No statuses available</div>
                    )}
                  </div>
                )}
              </div>
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
                onFocus={handleTextareaFocus}
                value={editData.notes}
                onChange={(e) => handleTextareaChange(e, 'notes')}
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
                disabled={isSaving || !editData.date || !hasChanges()}
                style={{ 
                  ...buttonBase, 
                  backgroundColor: hasChanges() ? COLORS.success : '#555', 
                  color: hasChanges() ? '#000' : '#aaa',
                  cursor: hasChanges() ? 'pointer' : 'not-allowed',
                  opacity: hasChanges() ? 1 : 0.6,
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', width: '100%', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleEditClick}
                style={{ ...buttonBase, backgroundColor: COLORS.buttonBg, color: '#fff', flex: 1 }}
              >Edit</button>
              <button 
                onClick={handleMoveToPlanner}
                disabled={isSaving}
                style={{ ...buttonBase, backgroundColor: '#3b82f6', color: '#fff', flex: 1.5 }}
              >
                Move to Planner
              </button>
              <button 
                onClick={() => setShowConfirm(true)}
                style={{ ...buttonBase, backgroundColor: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.danger}`, flex: 1 }}
              >Delete</button>
            </div>
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
