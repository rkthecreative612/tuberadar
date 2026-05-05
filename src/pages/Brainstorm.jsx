import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

const containerStyle = {
  backgroundColor: '#0f0f0f',
  minHeight: '100vh',
  width: '100%',
  fontFamily: 'sans-serif',
  color: 'white',
  boxSizing: 'border-box'
};

const titleStyle = {
  fontSize: '46px',
  fontWeight: '800',
  fontFamily: "'Outfit', 'Inter', 'Segoe UI', sans-serif",
  textAlign: 'center',
  padding: '40px 0',
  margin: 0,
  background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: '3px',
  textShadow: '0 4px 24px rgba(255, 255, 255, 0.1)'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '24px',
  padding: '24px',
  maxWidth: '1200px',
  margin: '0 auto'
};

const cardStyle = {
  backgroundColor: 'rgba(26, 26, 26, 0.5)',
  borderRadius: '16px',
  padding: '24px',
  minHeight: '180px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  position: 'relative',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  animation: 'breathe 4s ease-in-out infinite'
};

const topicNameStyle = {
  fontWeight: 'bold',
  color: 'white',
  fontSize: '18px',
  margin: '0 0 8px 0'
};

const countStyle = {
  color: '#888',
  fontSize: '14px',
  margin: 0
};

const buttonRowStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: 'auto',
  paddingTop: '16px'
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

const openButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: '#fff',
  color: '#000',
};

const plusCardStyle = {
  ...cardStyle,
  border: '2px dashed #444',
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'default'
};

const plusIconStyle = {
  fontSize: '48px',
  color: '#555',
  margin: 0
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: '#1a1a1a',
  padding: '24px',
  borderRadius: '12px',
  maxWidth: '400px',
  textAlign: 'center',
  border: '1px solid #333'
};

const modalMessageStyle = {
  color: 'white',
  fontSize: '16px',
  marginBottom: '24px',
  lineHeight: 1.5
};

const modalButtonStyle = {
  padding: '10px 24px',
  backgroundColor: '#fff',
  color: '#000',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const Brainstorm = () => {
  const [topics, setTopics] = useState([]);
  const [counts, setCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: channelsData, error: channelsError } = await supabase
        .from('my_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (channelsError) {
        console.error('Error fetching topics:', channelsError);
        return;
      }
      setTopics(channelsData || []);

      const { data: itemsData, error: itemsError } = await supabase
        .from('brainstorm_items')
        .select('topic_id');

      if (!itemsError && itemsData) {
        const countsMap = {};
        itemsData.forEach(item => {
          countsMap[item.topic_id] = (countsMap[item.topic_id] || 0) + 1;
        });
        setCounts(countsMap);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes breathe {
          0% { 
            box-shadow: 0 0 15px var(--glow-low), inset 0 0 10px var(--glow-inner); 
            border-color: var(--border-low);
          }
          50% { 
            box-shadow: 0 0 35px var(--glow-high), inset 0 0 20px var(--glow-inner-bright); 
            border-color: var(--border-high);
          }
          100% { 
            box-shadow: 0 0 15px var(--glow-low), inset 0 0 10px var(--glow-inner); 
            border-color: var(--border-low);
          }
        }
        .topic-card:hover {
          transform: translateY(-8px) scale(1.02);
          filter: brightness(1.1);
        }
      `}</style>
      <h1 style={titleStyle}>BRAINSTORM</h1>
      
      <div style={gridStyle}>
        {topics.map(topic => {
          const topicColor = topic.color || '#555555';
          return (
            <div 
              key={topic.id} 
              className="topic-card"
              style={{
                ...cardStyle,
                backgroundColor: `${topicColor}0D`, 
                '--glow-low': `${topicColor}22`,
                '--glow-high': `${topicColor}99`,
                '--glow-inner': `${topicColor}0D`,
                '--glow-inner-bright': `${topicColor}22`,
                '--border-low': `${topicColor}33`,
                '--border-high': `${topicColor}FF`,
              }}
            >
              <h2 style={topicNameStyle}>{topic.name}</h2>
              <p style={countStyle}>No of videos: {counts[topic.id] || 0}</p>
              
              <div style={buttonRowStyle}>
                <button 
                  style={openButtonStyle}
                  onClick={() => navigate(`/brainstorm/${topic.id}`)}
                >
                  Open
                </button>
                <button 
                  style={actionButtonStyle}
                  onClick={() => setShowModal(true)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        
        <div style={plusCardStyle} title="Auto-created with topics">
          <span style={plusIconStyle}>+</span>
        </div>
      </div>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <p style={modalMessageStyle}>
              To delete this Brainstormer, delete the channel from the Channels page
            </p>
            <button style={modalButtonStyle} onClick={() => setShowModal(false)}>
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brainstorm;
