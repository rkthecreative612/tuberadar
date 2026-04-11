import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const cardStyle = {
  width: '100%',
  height: '220px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '12px',
  padding: '20px',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
};

const avatarStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  fontWeight: 'bold',
  flexShrink: 0
};

const channelNameStyle = {
  fontWeight: 'bold',
  color: 'white',
  fontSize: '16px',
  margin: 0,
};

const statStyle = {
  color: '#ccc',
  fontSize: '13px',
  margin: 0,
  marginBottom: '8px',
  lineHeight: 1.4
};

const helperTextStyle = {
  color: '#888',
  fontSize: '12px',
  margin: 0,
  marginTop: 'auto',
  paddingTop: '12px'
};

const getAvatarColor = (name) => {
  const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f4511e', '#3949ab', '#00acc1'];
  return colors[(name || '').length % colors.length];
};

const ChannelCard = ({ ch, onClick }) => {
  const accentColor = getAvatarColor(ch.name);
  return (
    <div style={{ ...cardStyle, borderLeft: `4px solid ${accentColor}` }} onClick={() => onClick(ch)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ ...avatarStyle, backgroundColor: accentColor }}>
          {(ch.name || '?').charAt(0).toUpperCase()}
        </div>
        <h2 style={channelNameStyle}>{ch.name}</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={statStyle}>&#128197; Recent uploads: &mdash; videos (7 days)</p>
        <p style={statStyle}>&#128336; Last video: &mdash; hrs ago</p>
        <p style={statStyle}>&#11088; Channel score: &mdash;%</p>
      </div>

      <p style={helperTextStyle}>Click to view &rarr;</p>
    </div>
  );
};


const Home = ({ onChannelClick }) => {
  const [channels, setChannels] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('url');
  const [channelUrl, setChannelUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [extractedHandle, setExtractedHandle] = useState('');
  const [channelName, setChannelName] = useState('');
  const [keywords, setKeywords] = useState('');

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('channels').select('*');
    if (!error && data) {
      const unique = [];
      const names = new Set();
      for (const ch of data) {
        const normalized = (ch.name || '').toLowerCase().trim();
        if (!names.has(normalized)) {
          names.add(normalized);
          unique.push(ch);
        }
      }
      setChannels(unique);
    } else {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setChannelUrl(val);
    setUrlError('');
    setIsValidUrl(false);
    setExtractedHandle('');

    const trimmed = val.trim();
    if (!trimmed) return;

    let handle = '';
    const handleMatch = trimmed.match(/^https:\/\/(www\.)?youtube\.com\/@([a-zA-Z0-9_\-.]+)\/?$/);
    const channelIdMatch = trimmed.match(/^https:\/\/(www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_\-]+)\/?$/);

    if (handleMatch) {
      handle = handleMatch[2];
    } else if (channelIdMatch) {
      handle = channelIdMatch[2];
    }

    if (handle) {
      setIsValidUrl(true);
      setExtractedHandle(handle);
    } else {
      setUrlError('Please enter a valid YouTube channel URL');
    }
  };

  const handleSave = async () => {
    let finalName = '';
    let finalId = '';

    if (addMode === 'url') {
      if (!isValidUrl || !extractedHandle) {
        setUrlError('Please enter a valid YouTube channel URL');
        return;
      }
      finalName = extractedHandle;
      finalId = extractedHandle;
    } else {
      if (!channelName.trim() || !keywords.trim()) return;
      finalName = channelName.trim();
      finalId = keywords.trim();
    }

    const { error } = await supabase.from('channels').insert({
      name: finalName,
      channel_id: finalId,
    });

    if (!error) {
      setChannelName('');
      setKeywords('');
      setChannelUrl('');
      setExtractedHandle('');
      setIsValidUrl(false);
      setUrlError('');
      setShowAddForm(false);
      fetchChannels();
    } else {
      console.error(error);
    }
  };

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
  };

  const topBarStyle = {
    marginBottom: '40px',
  };

  const topBarTextStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
  };

  const mainContentStyle = {
    display: 'flex',
    flex: 1,
    gap: '60px',
  };

  const leftSectionStyle = {
    width: '250px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0,
  };

  const upcomingTitleStyle = {
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
    fontWeight: 'bold'
  };

  const featureItemStyle = {
    padding: '14px 16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    color: '#ccc',
    fontSize: '15px',
    border: '1px solid #222'
  };

  const centerAreaStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    flex: 1,
    alignItems: 'stretch'
  };

  const addCardStyle = {
    ...cardStyle,
    border: '1px dashed #555',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  };

  const formContainerStyle = {
    ...cardStyle,
    cursor: 'default',
    gap: '10px'
  };

  const modeToggleRowStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
  }

  const modeToggleBaseStyle = {
    flex: 1,
    padding: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: '#0a0a0a',
    border: '1px solid #333',
    color: '#888',
    borderRadius: '6px',
    cursor: 'pointer'
  }

  const modeToggleActiveStyle = {
    ...modeToggleBaseStyle,
    backgroundColor: '#fff',
    color: '#000',
    borderColor: '#fff'
  }

  const inputStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const saveButtonStyle = {
    padding: '10px',
    backgroundColor: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    marginTop: '4px'
  };

  const addIconStyle = {
    fontSize: '32px',
    color: '#888',
  };

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <h1 style={topBarTextStyle}>Welcome, RK &#128075;</h1>
      </div>
      <div style={mainContentStyle}>
        <div style={leftSectionStyle}>
          <div style={upcomingTitleStyle}>Upcoming Features</div>
          <div style={featureItemStyle}>Video Planner</div>
          <div style={featureItemStyle}>Brainstormer</div>
          <div style={featureItemStyle}>AI Insights</div>
          <div style={featureItemStyle}>Channel Analytics</div>
        </div>
        <div style={centerAreaStyle}>
          {channels.map((ch) => (
            <ChannelCard key={ch.id || ch.name} ch={ch} onClick={onChannelClick} />
          ))}

          {showAddForm ? (
            <div style={formContainerStyle}>
              <div style={modeToggleRowStyle}>
                <button type="button" style={addMode === 'url' ? modeToggleActiveStyle : modeToggleBaseStyle} onClick={() => setAddMode('url')}>By URL</button>
                <button type="button" style={addMode === 'keywords' ? modeToggleActiveStyle : modeToggleBaseStyle} onClick={() => setAddMode('keywords')}>By Keywords</button>
              </div>

              {addMode === 'url' ? (
                <>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{...inputStyle, paddingRight: isValidUrl ? '32px' : '10px'}}
                      placeholder="https://youtube.com/@handle"
                      value={channelUrl}
                      onChange={handleUrlChange}
                    />
                    {isValidUrl && (
                      <span style={{ position: 'absolute', right: '10px', top: '10px', color: '#4caf50', fontWeight: 'bold' }}>&#10004;</span>
                    )}
                  </div>
                  {urlError && <p style={{ color: '#ff5252', fontSize: '11px', margin: 0 }}>{urlError}</p>}
                </>
              ) : (
                <>
                  <input
                    style={inputStyle}
                    placeholder="Channel Name"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Keywords (e.g. tech)"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </>
              )}
              
              <button style={saveButtonStyle} onClick={handleSave}>Save</button>
            </div>
          ) : (
            <div style={addCardStyle} onClick={() => setShowAddForm(true)}>
              <span style={addIconStyle}>+</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
