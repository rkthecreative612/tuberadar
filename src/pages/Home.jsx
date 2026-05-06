/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

// --- STYLES ---

const cardStyle = {
  width: '100%',
  backgroundColor: 'rgba(26, 26, 26, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
  padding: '1px', // Gap for the rotating border
  overflow: 'hidden',
};

const avatarStyle = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  fontWeight: 'bold',
  flexShrink: 0,
  overflow: 'hidden'
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

const ChannelCard = ({ ch, onView, onEdit, allChannels, index }) => {
  const accentColor = ch.color || getFallbackColor(allChannels, ch);
  
  // Create variations in timing for a more natural feel
  const duration = 5 + (index % 3);
  const delay = index * 0.7;

  return (
    <div 
      className="shimmer-card"
      style={{ 
        ...cardStyle, 
        cursor: 'pointer',
        '--accent-color': accentColor,
        '--accent-glow': `${accentColor}44`, 
        '--float-delay': `${delay}s`,
        '--float-duration': `${duration}s`
      }}
      onClick={() => onView(ch.id)}
    >
      <div style={{
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        borderRadius: '15px',
        padding: '24px',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ ...avatarStyle, border: `2px solid ${accentColor}`, backgroundColor: '#111' }}>
            {ch.icon ? (
              ch.icon.startsWith('data:') ? (
                <img src={ch.icon} alt={ch.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{ch.icon}</span>
              )
            ) : (
              <span>{(ch.name || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2 style={channelNameStyle}>{ch.name}</h2>
        </div>

        <div style={buttonRowStyle}>
          <button 
            style={viewButtonStyle} 
            onClick={(e) => { e.stopPropagation(); onView(ch.id); }}
          >
            View
          </button>
          <button 
            style={actionButtonStyle} 
            onClick={(e) => { e.stopPropagation(); onEdit(ch); }}
          >
            Edit
          </button>
        </div>
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
  const [editIconValue, setEditIconValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const EMOJIS = ['🎬', '🎵', '🎮', '📚', '🍕', '💪', '🛍️', '✈️', '🎨', '💼', '🏠', '❤️'];

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
    setEditIconValue(ch.icon || '🎬');
    
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

    const validCompetitors = editCompetitors.filter(c => c.name.trim() || c.keywordsUrl.trim());
    if (validCompetitors.length === 0) {
      showToast('❌ Add at least 1 competitor URL to save', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Update channel
      const { error: chError } = await supabase
        .from('my_channels')
        .update({ 
          name: editName, 
          description: editUrl, 
          color: editColor,
          icon: editIconValue
        })
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
    // The button is disabled unless the names match, so we can proceed
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
    backgroundImage: 'radial-gradient(circle at 50% -20%, #1e1e1e 0%, #0f0f0f 80%)',
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
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-25deg); opacity: 0; }
          2% { opacity: 1; }
          15% { transform: translateX(150%) skewX(-25deg); opacity: 1; }
          17%, 100% { transform: translateX(150%) skewX(-25deg); opacity: 0; }
        }

        @keyframes glowShift {
          0%, 100% { 
            box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.3), 0 0 20px -5px var(--accent-glow);
          }
          50% { 
            box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.5), 0 0 35px 2px var(--accent-glow);
          }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .shimmer-card {
          position: relative;
          overflow: hidden;
          animation: glowShift var(--float-duration, 6s) ease-in-out infinite;
          animation-delay: var(--float-delay, 0s);
        }

        .shimmer-card::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: conic-gradient(
            transparent,
            var(--accent-color, #fff) 10%,
            transparent 25%,
            transparent 50%,
            var(--accent-color, #fff) 60%,
            transparent 75%,
            transparent 100%
          );
          animation: rotate 4s linear infinite;
          z-index: 1;
        }

        .shimmer-card::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 80%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 40%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.05) 60%,
            transparent 100%
          );
          animation: shimmer 7s infinite linear;
          pointer-events: none;
          z-index: 3;
        }

        .shimmer-card:hover {
          animation-play-state: paused;
          transform: translateY(-15px) scale(1.02) !important;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px 5px var(--accent-glow) !important;
          z-index: 10;
        }
      `}</style>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Welcome, RK 👋</h1>
      </div>

      <div style={centerAreaStyle}>
        {channels.map((ch, index) => (
          <ChannelCard 
            key={ch.id} 
            ch={ch} 
            index={index}
            allChannels={channels}
            onView={(id) => navigate(`/home/${id}`)}
            onEdit={handleOpenEdit}
          />
        ))}

        <div 
          className="shimmer-card"
          style={{ 
            ...cardStyle, 
            height: '140px', 
            cursor: 'pointer',
            backgroundColor: 'transparent',
            '--accent-color': 'rgba(255, 255, 255, 0.1)',
            '--accent-glow': 'rgba(255,255,255,0.05)',
            '--float-delay': '1.5s',
            '--float-duration': '7s'
          }} 
          onClick={() => navigate('/add-channel')}
        >
          <div style={{
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            borderRadius: '15px',
            height: '100%',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}>
            <span style={{ fontSize: '32px', color: '#444' }}>+</span>
            <span style={{ color: '#666', marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>Add Channel</span>
          </div>
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

            {/* --- EDIT MODAL ICON SELECTOR --- */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Channel Icon</label>
              
              <div style={{ 
                display: 'flex', flexWrap: 'wrap', gap: '8px',
                backgroundColor: '#0a0a0a', padding: '10px', borderRadius: '12px', border: '1px solid #333',
                justifyContent: 'center'
              }}>
                {EMOJIS.map(emoji => (
                  <div 
                    key={emoji}
                    onClick={() => setEditIconValue(emoji)}
                    className="modal-emoji-item"
                    style={{
                      fontSize: '16px', width: '32px', height: '32px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      borderRadius: '6px', transition: 'all 0.2s',
                      border: editIconValue === emoji ? '2px solid #22c55e' : '1px solid transparent',
                      backgroundColor: editIconValue === emoji ? 'rgba(34, 197, 94, 0.1)' : '#111',
                    }}
                  >
                    {emoji}
                  </div>
                ))}
                <style>{`
                  .modal-emoji-item:hover {
                    background-color: #2a2a2a !important;
                    transform: scale(1.1);
                  }
                `}</style>
              </div>
            </div>
            {/* --- END ICON SELECTOR --- */}

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
                  backgroundColor: confirmName.trim().toLowerCase() === editingChannel.name.trim().toLowerCase() ? '#ef4444' : '#333', 
                  color: 'white', 
                  border: 'none',
                  opacity: confirmName.trim().toLowerCase() === editingChannel.name.trim().toLowerCase() ? 1 : 0.5,
                  cursor: confirmName.trim().toLowerCase() === editingChannel.name.trim().toLowerCase() ? 'pointer' : 'not-allowed',
                  pointerEvents: 'auto' // Ensure clicks are always registered if visible
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePermanently();
                }}
                disabled={confirmName.trim().toLowerCase() !== editingChannel.name.trim().toLowerCase() || deleting}
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

