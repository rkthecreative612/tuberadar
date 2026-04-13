import React, { useState } from 'react';
import supabase from '../lib/supabase';

const AddChannel = ({ onBack, onSave }) => {
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [competitors, setCompetitors] = useState([
    { id: Date.now(), name: '', keywordsUrl: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    setLoading(true);
    setError(null);

    // Save to my_channels: id, name, description, created_at
    // we use description for channelUrl
    const { data: myChannelData, error: myChannelError } = await supabase
      .from('my_channels')
      .insert({
        name: channelName,
        description: channelUrl
      })
      .select()
      .single();

    if (myChannelError) {
      console.error(myChannelError);
      setError('Failed to save your channel');
      setLoading(false);
      return;
    }

    const validCompetitors = competitors.filter(c => c.name.trim() || c.keywordsUrl.trim());
    
    if (validCompetitors.length > 0) {
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
    }

    setLoading(false);
    if (onSave) onSave();
  };

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <button style={backButtonStyle} onClick={onBack}>&larr; Back</button>
        <h1 style={titleStyle}>Add Your Channel</h1>
      </div>

      <div style={formSectionStyle}>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px' }}>{error}</div>}
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Your Channel Name</label>
          <input 
            style={inputStyle} 
            placeholder="e.g. Code Masters" 
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Your Channel URL (optional)</label>
          <input 
            style={inputStyle} 
            placeholder="https://youtube.com/@codemasters" 
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
          />
        </div>

        <div style={sectionDividerStyle}></div>

        <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Add Competitor Channels</h3>
        
        {competitors.map((comp, idx) => (
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
