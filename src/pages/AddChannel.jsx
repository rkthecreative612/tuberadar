import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

const AddChannel = () => {
  const COLOR_PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [competitors, setCompetitors] = useState([
    { id: Date.now(), name: '', keywordsUrl: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedColors, setUsedColors] = useState([]);
  const [iconValue, setIconValue] = useState('🎬');
  const navigate = useNavigate();

  const EMOJIS = ['🎬', '🎵', '🎮', '📚', '🍕', '💪', '🛍️', '✈️', '🎨', '💼', '🏠', '❤️'];

  useEffect(() => {
    const fetchUsedColors = async () => {
      const { data } = await supabase.from('my_channels').select('color');
      if (data) {
        const colors = data.map(c => c.color).filter(Boolean);
        setUsedColors(colors);
        // Set first available color
        const firstAvailable = COLOR_PALETTE.find(c => !colors.includes(c));
        setSelectedColor(firstAvailable || COLOR_PALETTE[0]);
      } else {
        setSelectedColor(COLOR_PALETTE[0]);
      }
    };
    fetchUsedColors();
  }, []);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    fontFamily: 'sans-serif',
    color: 'white',
    padding: '40px',
    boxSizing: 'border-box',
    overflowY: 'auto'
  };

  const topBarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '40px'
  };

  const backButtonStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#ccc',
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  };

  const formSectionStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const labelStyle = {
    fontSize: '14px',
    color: '#ccc',
    fontWeight: 600
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const colorPickerContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '5px'
  };

  const colorOptionStyle = (color, isUsed, isSelected) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: color,
    cursor: isUsed ? 'not-allowed' : 'pointer',
    opacity: isUsed ? 0.3 : 1,
    border: isSelected ? '3px solid white' : 'none',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'transform 0.2s'
  });

  const sectionDividerStyle = {
    height: '1px',
    backgroundColor: '#333',
    margin: '10px 0'
  };

  const competitorRowStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  };

  const removeBtnStyle = {
    padding: '12px',
    backgroundColor: '#333',
    color: '#ff5252',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const addBtnStyle = {
    padding: '10px 16px',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    border: '1px dashed #555',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    alignSelf: 'flex-start'
  };

  const saveButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    alignSelf: 'flex-start',
    marginTop: '20px'
  };

  const addCompetitor = () => {
    setCompetitors([...competitors, { id: Date.now(), name: '', keywordsUrl: '' }]);
  };

  const removeCompetitor = (id) => {
    setCompetitors(competitors.filter(c => c.id !== id));
  };

  const updateCompetitor = (id, field, value) => {
    setCompetitors(competitors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!channelName.trim()) {
      setError('Your Channel Name is required');
      return;
    }

    const validCompetitors = competitors.filter(c => c.name.trim() || c.keywordsUrl.trim());
    if (validCompetitors.length === 0) {
      setError('Add at least 1 competitor URL to save');
      return;
    }

    setLoading(true);
    setError(null);

    // Save to my_channels: id, name, description, color, created_at, icon
    const { data: myChannelData, error: myChannelError } = await supabase
      .from('my_channels')
      .insert({
        name: channelName,
        description: channelUrl,
        color: selectedColor,
        icon: iconValue
      })
      .select()
      .single();

    if (myChannelError) {
      console.error(myChannelError);
      setError('Failed to save your channel');
      setLoading(false);
      return;
    }

    // competitor_channels: id, my_channel_id, name, channel_url, keywords, created_at
    const compRows = validCompetitors.map(c => {
      const isUrl = c.keywordsUrl.includes('youtube.com/') || c.keywordsUrl.includes('youtu.be/') || c.keywordsUrl.startsWith('@');
      return {
        my_channel_id: myChannelData.id,
        name: c.name,
        channel_url: isUrl ? c.keywordsUrl : null,
        keywords: !isUrl ? c.keywordsUrl : null
      };
    });

    const { error: compError } = await supabase
      .from('competitor_channels')
      .insert(compRows);

    if (compError) {
      console.error(compError);
      setError('Failed to save competitor channels');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/home');
  };

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <button style={backButtonStyle} onClick={() => navigate(-1)}>&larr; Back</button>
        <h1 style={titleStyle}>Add Your Channel</h1>
      </div>

      <div style={formSectionStyle}>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>{error}</div>}
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Your Channel Name</label>
          <input 
            style={inputStyle} 
            placeholder="e.g. Code Masters" 
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
        </div>

        {/* --- ICON SELECTOR SECTION --- */}
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Channel Icon</label>
          
          <div style={{ 
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            backgroundColor: '#0a0a0a', padding: '12px', borderRadius: '12px', border: '1px solid #333',
            justifyContent: 'center'
          }}>
            {EMOJIS.map(emoji => (
              <div 
                key={emoji}
                onClick={() => setIconValue(emoji)}
                className="emoji-item"
                style={{
                  fontSize: '18px', width: '36px', height: '36px', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  borderRadius: '8px', transition: 'all 0.2s',
                  border: iconValue === emoji ? '2px solid #22c55e' : '1px solid transparent',
                  backgroundColor: iconValue === emoji ? 'rgba(34, 197, 94, 0.1)' : '#1a1a1a',
                }}
              >
                {emoji}
              </div>
            ))}
            <style>{`
              .emoji-item:hover {
                background-color: #2a2a2a !important;
                transform: scale(1.1);
              }
            `}</style>
          </div>
        </div>
        {/* --- END ICON SELECTOR --- */}

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Your Channel URL (optional)</label>
          <input 
            style={inputStyle} 
            placeholder="https://youtube.com/@codemasters" 
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Pick Topic Color</label>
          <div style={colorPickerContainerStyle}>
            {COLOR_PALETTE.map(color => {
              const isUsed = usedColors.includes(color);
              const isSelected = selectedColor === color;
              return (
                <div 
                  key={color} 
                  style={colorOptionStyle(color, isUsed, isSelected)}
                  onClick={() => !isUsed && setSelectedColor(color)}
                  title={isUsed ? 'Color already in use' : color}
                >
                  {isSelected && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>✓</span>}
                  {isUsed && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#333', borderRadius: '50%', padding: '2px', fontSize: '10px' }}>🔒</span>}
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Unique colors help you distinguish topics across the app.
          </span>
        </div>

        <div style={sectionDividerStyle}></div>

        <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Add Competitor Channels</h3>
        
        {competitors.map((comp) => (
          <div key={comp.id} style={competitorRowStyle}>
            <div style={{...inputGroupStyle, flex: 1}}>
              <input 
                style={inputStyle} 
                placeholder="Competitor Name" 
                value={comp.name}
                onChange={(e) => updateCompetitor(comp.id, 'name', e.target.value)}
              />
            </div>
            <div style={{...inputGroupStyle, flex: 2}}>
              <input 
                style={inputStyle} 
                placeholder="YouTube URL or Search Keywords" 
                value={comp.keywordsUrl}
                onChange={(e) => updateCompetitor(comp.id, 'keywordsUrl', e.target.value)}
              />
            </div>
            {competitors.length > 1 && (
              <button style={removeBtnStyle} onClick={() => removeCompetitor(comp.id)}>X</button>
            )}
          </div>
        ))}

        <button style={addBtnStyle} onClick={addCompetitor}>+ Add Another Competitor</button>

        <button style={saveButtonStyle} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Channel'}
        </button>
      </div>
    </div>
  );
};

export default AddChannel;
