/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

// --- STYLES ---

const cardStyle = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '12px',
  padding: '20px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'transform 0.2s, border-color 0.2s',
};

const avatarStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 'bold',
  flexShrink: 0
};

const channelNameStyle = {
  fontWeight: 'bold',
  color: 'white',
  fontSize: '18px',
  margin: 0,
};

const COLOR_PALETTE = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4',
  '#ec4899', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e', '#14b8a6'
];

const getFallbackColor = (channels, currentChannel) => {
  if (currentChannel.color) return currentChannel.color;
  
  // Find first color from palette not used by any other channel
  const usedColors = channels.map(c => c.color).filter(Boolean);
  const available = COLOR_PALETTE.find(c => !usedColors.includes(c));
  return available || COLOR_PALETTE[0];
};

const buttonRowStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: '20px',
};

const actionButtonStyle = {
  flex: 1,
  padding: '10px',
  border: '1px solid #444',
  borderRadius: '8px',
  backgroundColor: '#2a2a2a',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background 0.2s'
};

const viewButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: '#fff',
  color: '#000',
  border: 'none',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalContentStyle = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '16px',
  padding: '30px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  position: 'relative'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle = {
  fontSize: '13px',
  color: '#aaa',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: 'white',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none'
};

// --- COMPONENTS ---

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: type === 'error' ? '#ef4444' : '#22c55e',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 2000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {message}
    </div>
  );
};

const ChannelCard = ({ ch, onView, onEdit, allChannels }) => {
  const accentColor = ch.color || getFallbackColor(allChannels, ch);
  return (
    <div style={{ ...cardStyle, borderTop: `4px solid ${accentColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ ...avatarStyle, backgroundColor: accentColor }}>
          {(ch.name || '?').charAt(0).toUpperCase()}
        </div>
        <h2 style={channelNameStyle}>{ch.name}</h2>
      </div>

      <div style={buttonRowStyle}>
        <button style={viewButtonStyle} onClick={() => onView(ch.id)}>View</button>
        <button style={actionButtonStyle} onClick={() => onEdit(ch)}>Edit</button>
      </div>
    </div>
  );
};

const Home = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Edit Modal State
  const [editingChannel, setEditingChannel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCompetitors, setEditCompetitors] = useState([]);
  const [editColor, setEditColor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchChannels = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('my_channels').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setChannels(data);
    } else if (error) {
      showToast('❌ Failed to load channels', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleOpenEdit = async (ch) => {
    setEditingChannel(ch);
    setEditName(ch.name);
    setEditUrl(ch.description || '');
    setEditColor(ch.color || getFallbackColor(channels, ch));
    
    // Fetch competitors
    const { data, error } = await supabase
      .from('competitor_channels')
      .select('*')
      .eq('my_channel_id', ch.id);
    
    if (!error && data) {
      setEditCompetitors(data.map(c => ({
        id: c.id,
        name: c.name,
        keywordsUrl: c.channel_url || c.keywords || ''
      })));
    } else {
      setEditCompetitors([]);
    }
  };

  const handleAddCompetitor = () => {
    setEditCompetitors([...editCompetitors, { id: Date.now(), name: '', keywordsUrl: '', isNew: true }]);
  };

  const handleUpdateCompetitor = (id, field, value) => {
    setEditCompetitors(editCompetitors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveCompetitor = (id) => {
    setEditCompetitors(editCompetitors.filter(c => c.id !== id));
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('❌ Channel name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Update channel
      const { error: chError } = await supabase
        .from('my_channels')
        .update({ name: editName, description: editUrl, color: editColor })
        .eq('id', editingChannel.id);
      
      if (chError) throw chError;

      // 2. Handle competitors (simpler to delete all and re-insert for updates)
      const { error: delError } = await supabase
        .from('competitor_channels')
        .delete()
        .eq('my_channel_id', editingChannel.id);
      
      if (delError) throw delError;

      const validCompetitors = editCompetitors.filter(c => c.name.trim() || c.keywordsUrl.trim());
      if (validCompetitors.length > 0) {
        const compRows = validCompetitors.map(c => {
          const isUrl = c.keywordsUrl.includes('youtube.com/') || c.keywordsUrl.includes('youtu.be/') || c.keywordsUrl.startsWith('@');
          return {
            my_channel_id: editingChannel.id,
            name: c.name,
            channel_url: isUrl ? c.keywordsUrl : null,
            keywords: !isUrl ? c.keywordsUrl : null
          };
        });

        const { error: insError } = await supabase
          .from('competitor_channels')
          .insert(compRows);
        
        if (insError) throw insError;
      }

      showToast('✅ Channel updated');
      setEditingChannel(null);
      fetchChannels();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to update channel', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (confirmName !== editingChannel.name) return;

    setDeleting(true);
    try {
      const chId = editingChannel.id;

      // Sequential deletion of related data
      await supabase.from('brainstorm_items').delete().eq('topic_id', chId);
      await supabase.from('planner_videos').delete().eq('topic_id', chId);
      await supabase.from('competitor_channels').delete().eq('my_channel_id', chId);
      
      const { error: finalError } = await supabase.from('my_channels').delete().eq('id', chId);
      
      if (finalError) throw finalError;

      showToast('❌ Channel deleted permanently');
      setShowDeleteConfirm(false);
      setEditingChannel(null);
      setConfirmName('');
      fetchChannels();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to delete channel', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    fontFamily: 'Inter, sans-serif',
    color: 'white',
    padding: '40px',
    boxSizing: 'border-box',
    overflowY: 'auto'
  };

  const centerAreaStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    flex: 1,
    alignItems: 'start',
    alignContent: 'start'
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Welcome, RK 👋</h1>
      </div>

      <div style={centerAreaStyle}>
        {channels.map((ch) => (
          <ChannelCard 
            key={ch.id} 
            ch={ch} 
            allChannels={channels}
            onView={(id) => navigate(`/home/${id}`)}
            onEdit={handleOpenEdit}
          />
        ))}

        <div 
          style={{ 
            ...cardStyle, 
            border: '2px dashed #333', 
            height: '130px', 
            justifyContent: 'center', 
            alignItems: 'center', 
            cursor: 'pointer',
            backgroundColor: 'transparent'
          }} 
          onClick={() => navigate('/add-channel')}
        >
          <span style={{ fontSize: '32px', color: '#555' }}>+</span>
          <span style={{ color: '#888', marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>Add Channel</span>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingChannel && !showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setEditingChannel(null)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: '22px' }}>Edit Channel</h2>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Channel Name</label>
              <input 
                style={inputStyle} 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                placeholder="e.g. My Awesome Channel"
              />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Topic Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                {COLOR_PALETTE.map(color => {
                  const isUsed = channels.some(c => c.color === color && c.id !== editingChannel.id);
                  const isSelected = editColor === color;
                  return (
                    <div 
                      key={color} 
                      onClick={() => !isUsed && setEditColor(color)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: isUsed ? 'not-allowed' : 'pointer',
                        opacity: isUsed ? 0.3 : 1,
                        border: isSelected ? '2px solid white' : 'none',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isSelected && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Channel URL (Optional)</label>
              <input 
                style={inputStyle} 
                value={editUrl} 
                onChange={e => setEditUrl(e.target.value)} 
                placeholder="https://youtube.com/@mychannel"
              />
            </div>

            <div style={inputGroupStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={labelStyle}>Competitor Channels</label>
                <button 
                  onClick={handleAddCompetitor}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + Add Another
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editCompetitors.map((comp) => (
                  <div key={comp.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      style={{ ...inputStyle, flex: 1 }} 
                      placeholder="Name" 
                      value={comp.name} 
                      onChange={e => handleUpdateCompetitor(comp.id, 'name', e.target.value)}
                    />
                    <input 
                      style={{ ...inputStyle, flex: 2 }} 
                      placeholder="URL or Keywords" 
                      value={comp.keywordsUrl} 
                      onChange={e => handleUpdateCompetitor(comp.id, 'keywordsUrl', e.target.value)}
                    />
                    <button 
                      onClick={() => handleRemoveCompetitor(comp.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', padding: '0 5px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                style={viewButtonStyle} 
                onClick={handleSaveEdit} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                style={{ ...actionButtonStyle, color: '#ef4444', borderColor: '#ef4444' }} 
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ ...modalContentStyle, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, color: '#ef4444' }}>Are you absolutely sure?</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              This action <strong>cannot be undone</strong>. This will permanently delete the 
              <strong> {editingChannel.name}</strong> channel and all its data:
            </p>
            <ul style={{ color: '#aaa', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
              <li>Channel & Competitor links</li>
              <li>All Brainstormed items</li>
              <li>All Planned & Scheduled videos</li>
              <li>Revenue tracking for this topic</li>
            </ul>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Type <span style={{ color: 'white' }}>{editingChannel.name}</span> to confirm</label>
              <input 
                style={inputStyle} 
                value={confirmName} 
                onChange={e => setConfirmName(e.target.value)}
                placeholder="Exact channel name"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                style={{ 
                  ...actionButtonStyle, 
                  backgroundColor: confirmName === editingChannel.name ? '#ef4444' : '#333', 
                  color: 'white', 
                  border: 'none',
                  opacity: confirmName === editingChannel.name ? 1 : 0.5,
                  cursor: confirmName === editingChannel.name ? 'pointer' : 'not-allowed'
                }} 
                onClick={handleDeletePermanently}
                disabled={confirmName !== editingChannel.name || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
              <button 
                style={actionButtonStyle} 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Home;

