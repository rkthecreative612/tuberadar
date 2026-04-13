import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const cardStyle = {
  width: '100%',
  height: '240px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '12px',
  padding: '20px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative'
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

const getAvatarColor = (name) => {
  const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f4511e', '#3949ab', '#00acc1'];
  return colors[(name || '').length % colors.length];
};

const buttonRowStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: 'auto',
  paddingTop: '12px'
};

const actionButtonStyle = {
  flex: 1,
  padding: '8px',
  border: '1px solid #444',
  borderRadius: '6px',
  backgroundColor: '#2a2a2a',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  textAlign: 'center'
};

const viewButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: '#fff',
  color: '#000',
};

const ChannelCard = ({ ch, onClick }) => {
  const accentColor = getAvatarColor(ch.name);
  return (
    <div style={{ ...cardStyle, borderTop: `4px solid ${accentColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ ...avatarStyle, backgroundColor: accentColor }}>
          {(ch.name || '?').charAt(0).toUpperCase()}
        </div>
        <h2 style={channelNameStyle}>{ch.name}</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={statStyle}>&#128197; Recent uploads: &mdash;</p>
        <p style={statStyle}>&#128336; Top performing: &mdash;</p>
        <p style={statStyle}>&#11088; Score: &mdash;</p>
      </div>

      <div style={buttonRowStyle}>
        <button style={viewButtonStyle} onClick={() => onClick(ch)}>View</button>
        <button style={actionButtonStyle}>Edit</button>
      </div>
    </div>
  );
};


const Home = ({ onChannelClick, onAddClick }) => {
  const [channels, setChannels] = useState([]);

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('my_channels').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setChannels(data);
    } else {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchChannels();
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
    alignItems: 'start',
    alignContent: 'start'
  };

  const addCardStyle = {
    ...cardStyle,
    border: '1px dashed #555',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  };

  const addIconStyle = {
    fontSize: '48px',
    color: '#555',
    margin: 0
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
            <ChannelCard key={ch.id} ch={ch} onClick={onChannelClick} />
          ))}

          <div style={addCardStyle} onClick={onAddClick}>
            <span style={addIconStyle}>+</span>
            <span style={{ color: '#888', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>Add Channel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
