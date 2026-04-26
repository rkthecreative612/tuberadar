import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import VideoDetailsModal from '../components/VideoDetailsModal';

const COLORS = {
  bgMain: '#0f0f0f',
  bgColumn: '#1a1a1a',
  bgCard: '#262626',
  bgCardHover: '#2a2a2a',
  borderColumn: '#333',
  borderCard: '#404040',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textGray: '#ccc',
  accentRed: '#ef4444',
  accentGreen: '#22c55e',
  accentBlue: '#3b82f6',
  dropHighlight: '#666',
  modalBg: '#111111',
};

const SWATCHES = [
  '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#6366f1', '#f43f5e', '#14b8a6', '#6b7280'
];

const Status = () => {
  const [columns, setColumns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [draggedVideoId, setDraggedVideoId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'color' | 'rename' | 'delete'
  const [targetColumn, setTargetColumn] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [newName, setNewName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState(SWATCHES[0]);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  // Filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [selectedTopics, setSelectedTopics] = useState([]); // Empty = All Topics
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Drag-to-scroll state
  const [isDraggable, setIsDraggable] = useState(false);
  const boardRef = useRef(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const menuRef = useRef(null);
  const filterRef = useRef(null);
  const monthRef = useRef(null);

  const fetchBoardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Column Configuration
      const { data: colsData, error: colsErr } = await supabase
        .from('status_columns')
        .select('*')
        .eq('workspace_id', 'default')
        .eq('is_deleted', false)
        .gte('position', 0)
        .order('position', { ascending: true });

      if (colsErr) throw colsErr;
      setColumns(colsData || []);

      // 2. Fetch Videos (only in specific statuses)
      const validStatuses = (colsData || []).map(c => c.column_key);
      const { data: videosData, error: videosErr } = await supabase
        .from('planner_videos')
        .select('*')
        .eq('is_deleted', false)
        .in('video_status', validStatuses);


      if (videosErr) throw videosErr;
      setVideos(videosData || []);

      // 3. Fetch Topics
      const { data: topicsData, error: topicsErr } = await supabase
        .from('my_channels')
        .select('*');

      if (topicsErr) throw topicsErr;
      setTopics(topicsData || []);

    } catch (err) {
      console.error('Error fetching board data:', err);
      showToast('❌ Failed to load board', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null);
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterDropdown(false);
      if (monthRef.current && !monthRef.current.contains(e.target)) setShowMonthDropdown(false);
    };
    const handleContextMenu = (e) => {
      if (dragRef.current.isDown || isDraggable) {
        e.preventDefault();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdownElement = document.querySelector('[data-topic-dropdown]');
      if (dropdownElement && !dropdownElement.contains(e.target)) {
        setShowTopicDropdown(false);
      }
    };

    if (showTopicDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTopicDropdown]);

  useEffect(() => {
    const descriptionTA = document.querySelector('[data-description-textarea]');
    const notesTA = document.querySelector('[data-notes-textarea]');

    const autoExpand = (textarea) => {
      if (textarea) {
        textarea.style.height = 'auto'; // reset height
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
      }
    };

    const handleInputDesc = () => autoExpand(descriptionTA);
    const handleInputNotes = () => autoExpand(notesTA);

    if (descriptionTA) {
      descriptionTA.addEventListener('input', handleInputDesc);
      autoExpand(descriptionTA); // Initial call
    }
    if (notesTA) {
      notesTA.addEventListener('input', handleInputNotes);
      autoExpand(notesTA); // Initial call
    }

    return () => {
      if (descriptionTA) descriptionTA.removeEventListener('input', handleInputDesc);
      if (notesTA) notesTA.removeEventListener('input', handleInputNotes);
    };
  }, [activeModal]);

  const handleBoardMouseDown = (e) => {
    if (e.button === 2) { // Right click
      e.preventDefault();
      dragRef.current = { isDown: true, startX: e.pageX - boardRef.current.offsetLeft, scrollLeft: boardRef.current.scrollLeft };
      setIsDraggable(true);
    }
  };

  const handleBoardMouseMove = (e) => {
    if (!dragRef.current.isDown) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - dragRef.current.startX) * 1.5;
    boardRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const handleBoardMouseUp = () => {
    dragRef.current.isDown = false;
    setIsDraggable(false);
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- ACTIONS ---

  const handleDragStart = (e, videoId) => {
    setDraggedVideoId(videoId);
    e.dataTransfer.setData('videoId', videoId);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const videoId = e.dataTransfer.getData('videoId');
    // Get overVideoId from the drop target element
    const overVideoId = e.target.closest('[data-video-id]')?.dataset.videoId;
    setDragOverColumn(null);

    const video = videos.find(v => String(v.id) === String(videoId));
    if (!video) return;

    const oldStatus = video.video_status;
    const statusChanged = video.video_status !== newStatus;

    // Get videos in the target column
    const targetColVideos = videos.filter(v => v.video_status === newStatus).sort((a, b) => (a.position || 0) - (b.position || 0));

    let newPosition = 1;
    if (overVideoId && statusChanged === false) {
      // Within same column: find position relative to target video
      const overIndex = targetColVideos.findIndex(v => String(v.id) === String(overVideoId));
      if (overIndex >= 0) {
        newPosition = overIndex + 1;
      } else {
        newPosition = targetColVideos.length + 1;
      }
    } else if (statusChanged) {
      // Moving to different column: add to end
      newPosition = targetColVideos.length + 1;
    } else {
      // Same column, no over target: add to end
      newPosition = targetColVideos.length + 1;
    }

    // Optimistic update
    setVideos(prev => {
      const updated = prev.map(v => v.id === video.id ? { ...v, video_status: newStatus, position: newPosition } : v);
      return updated;
    });

    try {
      const updatePayload = { video_status: newStatus, position: newPosition };
      const { error } = await supabase
        .from('planner_videos')
        .update(updatePayload)
        .eq('id', video.id);

      if (error) throw error;
      const colLabel = columns.find(c => c.column_key === newStatus)?.column_name;
      showToast(`✅ ${statusChanged ? 'Moved to' : 'Reordered in'} ${colLabel}`);
    } catch (err) {
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, video_status: oldStatus } : v));
      showToast('❌ Failed to update', 'error');
    }
  };

  const handleSaveNewVideo = async (topicId) => {
    if (!title.trim()) {
      showToast('❌ Title required', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('planner_videos')
        .insert({
          video_title: title,
          video_description: description,
          notes: notes,
          binded_videos: [],
          topic_id: topicId,
          video_status: targetColumn.column_key,
          status: 'status_only',
          position: 0,
          original_added_at: new Date().toISOString(),
        });

      if (error) throw error;
      showToast('✅ Video added');
      setTitle('');
      setDescription('');
      setNotes('');
      setShowTopicDropdown(false);
      setActiveModal(null);
      fetchBoardData();
    } catch (err) {
      console.error('Save error:', err);
      showToast('❌ Failed to add video', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateColor = async (color) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('status_columns')
        .update({ color })
        .eq('id', targetColumn.id);

      if (error) throw error;
      showToast('✅ Color updated');
      setColumns(prev => prev.map(c => c.id === targetColumn.id ? { ...c, color } : c));
      setActiveModal(null);
    } catch (err) {
      showToast('❌ Failed to update color', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('status_columns')
        .update({ column_name: newName })
        .eq('id', targetColumn.id);

      if (error) throw error;
      showToast('✅ Column renamed');
      setColumns(prev => prev.map(c => c.id === targetColumn.id ? { ...c, column_name: newName } : c));
      setActiveModal(null);
    } catch (err) {
      showToast('❌ Failed to rename', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newName.trim()) return;
    setActionLoading(true);
    try {
      const columnKey = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const existing = columns.find(c => c.column_key === columnKey || c.column_name.toLowerCase() === newName.toLowerCase());
      
      if (existing) {
        showToast('❌ Section name or key already exists', 'error');
        setActionLoading(false);
        return;
      }

      const maxPos = columns.reduce((max, c) => Math.max(max, c.position), -1);
      
      const { error } = await supabase
        .from('status_columns')
        .insert({
          column_name: newName,
          column_key: columnKey,
          color: newSectionColor,
          position: maxPos + 1,
          workspace_id: 'default',
          is_deleted: false
        });

      if (error) throw error;
      showToast(`✅ Section '${newName}' created`);
      setActiveModal(null);
      setNewName('');
      fetchBoardData();
    } catch (err) {
      showToast('❌ Failed to create section', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveColumn = async (col, direction) => {
    const currentIndex = columns.findIndex(c => c.id === col.id);
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const targetCol = columns[targetIndex];
    const currentPos = col.position;
    const targetPos = targetCol.position;

    setColumns(prev => {
      const next = [...prev];
      next[currentIndex] = { ...col, position: targetPos };
      next[targetIndex] = { ...targetCol, position: currentPos };
      return next.sort((a,b) => a.position - b.position);
    });

    try {
      const { error } = await supabase
        .from('status_columns')
        .update({ position: targetPos })
        .eq('id', col.id);
      
      if (error) throw error;

      const { error: error2 } = await supabase
        .from('status_columns')
        .update({ position: currentPos })
        .eq('id', targetCol.id);
      
      if (error2) throw error2;

      showToast(`✅ Moved ${col.column_name} ${direction}`);
    } catch (err) {
      showToast('❌ Failed to reorder', 'error');
      fetchBoardData(); // Rollback
    }
  };

  const handleDeleteColumn = async () => {
    setActionLoading(true);
    try {
      // 1. Mark column as deleted
      const { error: colErr } = await supabase
        .from('status_columns')
        .update({ is_deleted: true })
        .eq('id', targetColumn.id);

      if (colErr) throw colErr;

      // 2. Delete all videos in this column
      const { error: vidErr } = await supabase
        .from('planner_videos')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('video_status', targetColumn.column_key);


      if (vidErr) throw vidErr;

      showToast(`✅ ${targetColumn.column_name} deleted`);
      setColumns(prev => prev.filter(c => c.id !== targetColumn.id));
      setVideos(prev => prev.filter(v => v.video_status !== targetColumn.column_key));
      setActiveModal(null);
    } catch (err) {
      showToast('❌ Failed to delete column', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- RENDERING HELPERS ---

  const getTopicColor = (topicId) => {
    const index = topics.findIndex(t => t.id === topicId);
    if (index === -1) return '#888';
    const TOPIC_COL_PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4'];
    return TOPIC_COL_PALETTE[index % TOPIC_COL_PALETTE.length];
  };

  const getTopicName = (topicId) => topics.find(t => t.id === topicId)?.name || 'Unknown Topic';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString.includes('Z') ? dateString : dateString + 'Z'); 
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // --- STYLES ---

  const rootStyle = {
    padding: '32px',
    height: '100%',
    backgroundColor: COLORS.bgMain,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    overflow: 'hidden',
  };

  const headerStyle = { fontSize: '32px', fontWeight: '700', marginBottom: '32px', margin: 0 };

  const boardStyle = {
    display: 'flex',
    gap: '16px',
    flex: 1,
    overflowX: 'auto',
    alignItems: 'flex-start',
    paddingBottom: '20px',
    cursor: isDraggable ? 'grabbing' : 'default',
    userSelect: 'none',
    scrollbarWidth: 'none', // Firefox
  };

  const columnStyle = (isOver) => ({
    minWidth: '280px',
    width: '280px',
    backgroundColor: COLORS.bgColumn,
    border: `1px solid ${isOver ? COLORS.dropHighlight : COLORS.borderColumn}`,
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 200px)',
    borderStyle: isOver ? 'dashed' : 'solid',
    borderWidth: isOver ? '2px' : '1px',
    transition: 'all 200ms ease',
  });

  const columnHeaderStyle = {
    padding: '12px',
    borderBottom: `1px solid ${COLORS.borderColumn}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
  };

  const columnDotStyle = (color) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color });

  const columnLabelStyle = { fontSize: '14px', fontWeight: '600', margin: 0, flex: 1 };

  const badgeStyle = { fontSize: '11px', color: COLORS.textSecondary, backgroundColor: '#333', padding: '2px 8px', borderRadius: '10px' };

  const iconBtnStyle = {
    background: 'none',
    border: 'none',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  };

  const cardsContainerStyle = {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    flex: 1,
  };

  const cardStyle = (topicColor) => ({
    backgroundColor: COLORS.bgCard,
    border: `1px solid ${COLORS.borderCard}`,
    borderLeft: `4px solid ${topicColor}`,
    borderRadius: '8px',
    padding: '10px',
    cursor: draggedVideoId ? 'grabbing' : 'grab',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
  };

  const modalStyle = {
    width: '400px',
    backgroundColor: COLORS.modalBg,
    border: `1px solid ${COLORS.borderColumn}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const textareaStyle = { ...inputStyle, resize: 'none', height: '120px' };

  const actionBtnStyle = (danger) => ({
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: danger ? COLORS.accentRed : '#fff',
    color: danger ? '#fff' : '#000',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'opacity 0.2s',
  });

  const cancelBtnStyle = {
    background: 'none',
    border: 'none',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '45px',
    right: '16px',
    backgroundColor: '#222',
    border: '1px solid #444',
    borderRadius: '8px',
    width: '160px',
    zIndex: 100,
    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  };

  const dropdownItemStyle = {
    padding: '10px 16px',
    fontSize: '13px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'none',
  };

  // --- SUB-COMPONENTS ---

  const Modal = ({ title, children, onSave, onCancel, saveLabel = 'Save', danger = false }) => (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{title}</h3>
        <div style={{ marginBottom: '24px' }}>{children}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button style={cancelBtnStyle} onClick={onCancel}>Cancel</button>
          <button style={actionBtnStyle(danger)} onClick={onSave} disabled={actionLoading}>
            {actionLoading ? 'Loading...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={rootStyle}>
      <style>{`
        .board-container::-webkit-scrollbar { display: none; }
        .cards-container::-webkit-scrollbar { width: 4px; }
        .cards-container::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        button:hover { opacity: 0.8; }
        .icon-btn:hover { background: #333; color: #fff; }
        .dropdown-item:hover { background: #333; }
        .topic-select-btn:hover { background-color: #333 !important; }
        .tooltip { position: relative; }
        .tooltip:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #444;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 1000;
          margin-bottom: 8px;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={headerStyle}>Status</h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Month Picker */}
          <div style={{ position: 'relative' }} ref={monthRef}>
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              style={{
                backgroundColor: '#262626',
                border: '1px solid #333',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📅 {new Date(selectedMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
            </button>
            
            {showMonthDropdown && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '8px',
                width: '200px',
                zIndex: 100,
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px'
              }}>
                {[-2, -1, 0, 1, 2, 3].map(offset => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + offset);
                  const key = d.toISOString().substring(0, 7);
                  return (
                    <button
                      key={key}
                      onClick={() => { setSelectedMonth(key); setShowMonthDropdown(false); }}
                      style={{
                        padding: '6px',
                        fontSize: '11px',
                        backgroundColor: selectedMonth === key ? '#333' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Topics */}
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              style={{
                backgroundColor: '#262626',
                border: '1px solid #333',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔍 Filter {selectedTopics.length > 0 ? `(${selectedTopics.length})` : ''}
              <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
            </button>

            {showFilterDropdown && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '8px',
                width: '180px',
                zIndex: 100,
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <button
                  onClick={() => setSelectedTopics([])}
                  style={{
                    width: '100%',
                    padding: '8px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <input type="checkbox" checked={selectedTopics.length === 0} readOnly />
                  All Topics
                </button>
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (selectedTopics.includes(t.id)) setSelectedTopics(selectedTopics.filter(id => id !== t.id));
                      else setSelectedTopics([...selectedTopics, t.id]);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <input type="checkbox" checked={selectedTopics.includes(t.id)} readOnly />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          Loading Board...
        </div>
      ) : (
        <div
          ref={boardRef}
          style={boardStyle}
          onMouseDown={handleBoardMouseDown}
          onMouseMove={handleBoardMouseMove}
          onMouseUp={handleBoardMouseUp}
          onMouseLeave={handleBoardMouseUp}
        >
          {columns.map(col => {
            const colVideos = videos.filter(v => {
              const matchesStatus = v.video_status === col.column_key;
              const matchesMonth = v.created_at.startsWith(selectedMonth);
              const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(v.topic_id);
              return matchesStatus && matchesMonth && matchesTopic;
            }).sort((a, b) => (a.position || 0) - (b.position || 0));
            const isOver = dragOverColumn === col.column_key;
            const isMenuOpen = menuOpenId === col.id;

            return (
              <div
                key={col.id}
                style={{
                  ...columnStyle(isOver),
                  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: isOver ? 'rgba(59, 130, 246, 0.08)' : COLORS.bgColumn,
                  boxShadow: isOver ? '0 0 0 2px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(59, 130, 246, 0.05)' : 'none',
                }}
                onDragOver={e => { e.preventDefault(); setDragOverColumn(col.column_key); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={e => handleDrop(e, col.column_key)}
              >
                <div style={columnHeaderStyle}>
                  <div style={columnDotStyle(col.color)} />
                  <h3 style={columnLabelStyle}>{col.column_name}</h3>
                  <span style={badgeStyle}>{colVideos.length}</span>
                  
                  <button 
                    className="icon-btn tooltip" 
                    style={iconBtnStyle} 
                    data-tooltip="Add new video"
                    onClick={() => { setTargetColumn(col); setActiveModal('add'); }}
                  >+</button>
                  
                  <button 
                    className="icon-btn" 
                    style={iconBtnStyle}
                    onClick={() => setMenuOpenId(isMenuOpen ? null : col.id)}
                  >⋮</button>

                  {isMenuOpen && (
                    <div style={dropdownStyle} ref={menuRef}>
                      <button 
                        className="dropdown-item" 
                        style={dropdownItemStyle}
                        onClick={() => { setTargetColumn(col); setNewName(col.column_name); setActiveModal('rename'); setMenuOpenId(null); }}
                      >Edit Name</button>
                      <button 
                        className="dropdown-item" 
                        style={dropdownItemStyle}
                        onClick={() => { setTargetColumn(col); setActiveModal('color'); setMenuOpenId(null); }}
                      >Change Color</button>
                      <button 
                        className="dropdown-item" 
                        disabled={columns.findIndex(c => c.id === col.id) === 0}
                        style={{ ...dropdownItemStyle, opacity: columns.findIndex(c => c.id === col.id) === 0 ? 0.4 : 1 }}
                        onClick={() => { handleMoveColumn(col, 'left'); setMenuOpenId(null); }}
                      >Move Left ←</button>
                      <button 
                        className="dropdown-item" 
                        disabled={columns.findIndex(c => c.id === col.id) === columns.length - 1}
                        style={{ ...dropdownItemStyle, opacity: columns.findIndex(c => c.id === col.id) === columns.length - 1 ? 0.4 : 1 }}
                        onClick={() => { handleMoveColumn(col, 'right'); setMenuOpenId(null); }}
                      >Move Right →</button>
                      <button 
                        className="dropdown-item" 
                        style={{ ...dropdownItemStyle, color: COLORS.accentRed }}
                        onClick={() => { setTargetColumn(col); setActiveModal('delete'); setMenuOpenId(null); }}
                      >Delete Column</button>
                    </div>
                  )}
                </div>

                <div className="cards-container" style={cardsContainerStyle}>
                  {colVideos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '20px' }}>No videos yet</div>
                  ) : (
                    colVideos.map(v => {
                      const topicColor = getTopicColor(v.topic_id);
                      return (
                        <div
                          key={v.id}
                          draggable
                          onDragStart={e => handleDragStart(e, v.id)}
                          onDragEnd={() => setDraggedVideoId(null)}
                          onClick={() => setSelectedVideo(v)}
                          data-video-id={v.id}
                          style={{
                            ...cardStyle(topicColor),
                            opacity: draggedVideoId === v.id ? 0.5 : 1,
                            transform: draggedVideoId === v.id ? 'scale(0.95) rotate(2deg)' : 'scale(1) rotate(0deg)',
                            transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: draggedVideoId === v.id 
                              ? '0 20px 40px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.1)' 
                              : 'none',
                          }}
                          onMouseEnter={e => {
                            if (draggedVideoId !== v.id) {
                              e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (draggedVideoId !== v.id) {
                              e.currentTarget.style.backgroundColor = COLORS.bgCard;
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '500', color: '#fff', lineHeight: '1.4' }}>{v.video_title}</h4>
                              <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>{getTopicName(v.topic_id)}</div>
                              {v.created_at && (
                                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>📅 {formatDate(v.created_at)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          
          <button
            className="tooltip"
            data-tooltip="Create new section"
            onClick={() => { setNewName(''); setActiveModal('create'); }}
            style={{
              minWidth: '60px',
              height: '56px',
              backgroundColor: '#1a1a1a',
              border: `1px solid ${COLORS.borderColumn}`,
              borderRadius: '12px',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              marginTop: '0'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff', e.currentTarget.style.borderColor = '#555' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#888', e.currentTarget.style.borderColor = COLORS.borderColumn }}
          >+</button>
        </div>
      )}

      {/* MODALS */}
      {activeModal === 'add' && (
        <div style={modalOverlayStyle} onClick={() => setActiveModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Add New Video to {targetColumn?.column_name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ color: '#999', fontSize: '12px' }}>Title</label>
                  <span style={{ color: '#666', fontSize: '12px' }}>{title.length}/100</span>
                </div>
                <input 
                  style={inputStyle} 
                  value={title}
                  onChange={e => setTitle(e.target.value.slice(0, 100))}
                  placeholder="Video title..."
                  type="text"
                  maxLength={100}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Description</label>
                <textarea 
                  data-description-textarea
                  style={{ ...textareaStyle, overflow: 'hidden', resize: 'none', minHeight: '80px', maxHeight: '300px', height: 'auto' }}
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 5000))}
                  placeholder="Video description..."
                  maxLength={5000}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ color: '#999', fontSize: '12px' }}>Notes</label>
                  <span style={{ color: '#666', fontSize: '12px' }}>{notes.length}/5000</span>
                </div>
                <textarea 
                  data-notes-textarea
                  style={{ ...textareaStyle, overflow: 'hidden', resize: 'none', minHeight: '80px', maxHeight: '300px', height: 'auto' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value.slice(0, 5000))}
                  placeholder="Add secret notes..."
                  maxLength={5000}
                />
              </div>
              
              <div style={{ position: 'relative', display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
                <button style={cancelBtnStyle} onClick={() => setActiveModal(null)}>Cancel</button>
                
                <div style={{ position: 'relative' }}>
                  <button 
                    style={{ ...actionBtnStyle(), width: '120px' }} 
                    onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Save Video'}
                  </button>
                  
                  {showTopicDropdown && (
                    <div 
                      data-topic-dropdown
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 10px)',
                        right: 0,
                        backgroundColor: '#262626',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        minWidth: '220px',
                        zIndex: 1001,
                        boxShadow: '0 12px 24px rgba(0,0,0,0.6)',
                        padding: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: '#888', borderBottom: '1px solid #333', marginBottom: '4px' }}>
                        SELECT TOPIC
                      </div>
                      {topics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => handleSaveNewVideo(topic.id)}
                          style={{
                                display: 'block',
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '13px',
                                borderRadius: '6px',
                                transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          {topic.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'color' && (
        <Modal 
          title="Change Column Color"
          onCancel={() => setActiveModal(null)}
          onSave={() => {}} // Not needed as selection saves
          saveLabel="Apply"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            {SWATCHES.map(color => (
              <button
                key={color}
                onClick={() => handleUpdateColor(color)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: targetColumn?.color === color ? '3px solid #fff' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {targetColumn?.color === color && <span style={{ color: '#fff' }}>✓</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {activeModal === 'rename' && (
        <Modal 
          title="Rename Column"
          onCancel={() => setActiveModal(null)}
          onSave={handleRename}
        >
          <div>
            <input 
              style={inputStyle} 
              maxLength={30}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#666', marginTop: '4px' }}>{newName.length}/30</div>
          </div>
        </Modal>
      )}

      {activeModal === 'delete' && (
        <Modal 
          title="Delete Column?"
          onCancel={() => setActiveModal(null)}
          onSave={handleDeleteColumn}
          saveLabel="Delete Column"
          danger
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#ccc', lineHeight: '1.6' }}>
            This will delete the entire column <strong>{targetColumn?.column_name}</strong> and all videos in it. This action cannot be undone.
          </p>
        </Modal>
      )}

      {activeModal === 'create' && (
        <Modal 
          title="Create New Section"
          onCancel={() => setActiveModal(null)}
          onSave={handleCreateSection}
          saveLabel="Create Section"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Section Name</label>
              <input 
                style={inputStyle} 
                maxLength={30}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                placeholder="Review, Approved, etc."
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#666', marginTop: '4px' }}>{newName.length}/30</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Section Color</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                {SWATCHES.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewSectionColor(color)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: newSectionColor === color ? '3px solid #fff' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {newSectionColor === color && <span style={{ color: '#fff' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? COLORS.accentRed : '#22c55e',
          color: '#fff',
          fontWeight: '700',
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
          zIndex: 3000,
          animation: 'slideIn 0.3s ease-out',
        }}>
          {toast.text}
        </div>
      )}

      {/* Removed TopicSelectorModal rendering */}

      {selectedVideo && (
        <VideoDetailsModal 
          video={selectedVideo}
          topicName={getTopicName(selectedVideo.topic_id)}
          topicColor={getTopicColor(selectedVideo.topic_id)}
          onClose={() => setSelectedVideo(null)}
          onDeleteSuccess={(id) => {
            setVideos(prev => prev.filter(v => v.id !== id));
            setSelectedVideo(null);
            showToast('✅ Video deleted');
          }}
          onUpdateSuccess={(updated) => {
            setVideos(prev => prev.map(v => v.id === updated.id ? updated : v));
            // Don't close modal, just update
            setSelectedVideo(updated);
            showToast('✅ Video updated');
          }}
        />
      )}
    </div>
  );
};

export default Status;
