import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { searchChannelByKeyword } from '../lib/youtube';


export default function SmartSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchFields, setSearchFields] = useState(['title']);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch all topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase
        .from('my_channels')
        .select('id, name')
        .order('created_at', { ascending: false });
      
      if (data) {
        setAllTopics(data);
        // Select all by default
        setSelectedTopics(data.map(t => t.id));
      }
    };
    
    fetchTopics();
  }, []);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Main search function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showToast('❌ Enter a search term', 'error');
      return;
    }

    if (selectedTopics.length === 0) {
      showToast('❌ Select at least one topic', 'error');
      return;
    }

    setIsSearched(true);
    setHasSearched(true);
    setLoading(true);
    setResults({});

    try {
      // Get channels for selected topics
      const { data: channels, error } = await supabase
        .from('competitor_channels')
        .select('*')
        .in('my_channel_id', selectedTopics);

      if (error) throw error;

      if (!channels || channels.length === 0) {
        showToast('❌ No channels added to selected topics', 'error');
        setLoading(false);
        return;
      }

      // Group channels by topic
      const topicMap = {};
      allTopics.forEach(topic => {
        topicMap[topic.id] = topic.name;
      });

      // Search each channel
      const groupedResults = {};

      for (const channel of channels) {
        const topicId = channel.my_channel_id;
        const channelName = channel.name;
        const channelUrl = channel.channel_url;

        // Extract handle from URL
        const handle = extractChannelHandle(channelUrl);

        // Fetch fresh videos from YouTube API
        const videos = await searchChannelByKeyword(searchQuery, handle, searchFields);

        if (videos.length > 0) {
          if (!groupedResults[topicId]) {
            groupedResults[topicId] = {};
          }
          groupedResults[topicId][channelName] = videos;
        }
      }

      setResults(groupedResults);

      if (Object.keys(groupedResults).length === 0) {
        showToast('❌ No videos found', 'error');
      } else {
        showToast('✅ Search complete', 'success');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('❌ Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract channel handle from URL
  const extractChannelHandle = (url) => {
    if (!url) return '';
    if (url.includes('@')) {
      return url.split('@')[1].split('/')[0];
    }
    if (url.includes('/c/')) {
      return url.split('/c/')[1].split('/')[0];
    }
    return url;
  };

  // Toggle topic selection
  const toggleTopic = (topicId) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Move video to brainstorm
  const handleMoveToBrainstorm = async (video, topicId) => {
    try {
      const score = calcScore(video);
      
      const { error } = await supabase
        .from('brainstorm_items')
        .insert({
          topic_id: topicId,
          video_id: video.videoId,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          likes: String(video.likes),
          comments: String(video.commentCount),
          score: String(score),
          status: 'brainstorm',
          binded_videos: [
            {
              videoId: video.videoId,
              title: video.title,
              thumbnail: video.thumbnail
            }
          ]
        });

      if (error) throw error;

      showToast('✅ Moved to Brainstorm');

      // Remove video from current results display
      setResults(prev => {
        const next = { ...prev };
        if (next[topicId]) {
          const newChannels = { ...next[topicId] };
          let found = false;
          for (const channelName in newChannels) {
            const filtered = newChannels[channelName].filter(v => v.videoId !== video.videoId);
            if (filtered.length !== newChannels[channelName].length) {
              newChannels[channelName] = filtered;
              found = true;
            }
          }
          if (found) {
            next[topicId] = newChannels;
          }
        }
        return next;
      });
    } catch (error) {
      console.error('Error moving to brainstorm:', error);
      showToast('❌ Failed to move', 'error');
    }
  };

  // Color cycling for topics
  const topicColors = ['#ef4444', '#22c55e', '#3b82f6'];
  const getTopicColor = (index) => topicColors[index % topicColors.length];

  // Styles


  const contentStyle = {
    backgroundColor: '#0f0f0f',
    minHeight: '100vh',
    color: '#fff',
    padding: '20px',
    position: 'relative'
  };

  const searchContainerStyle = {
    position: 'fixed',
    top: isSearched ? '20px' : '50%',
    left: isSearched ? '260px' : '50%',
    transform: isSearched ? 'translateX(0)' : 'translate(-50%, -50%)',
    width: isSearched ? '600px' : '700px',
    height: 'auto',
    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    zIndex: 100
  };

  const searchInputStyle = {
    width: '100%',
    height: '100%',
    padding: '15px 18px',
    fontSize: isSearched ? '14px' : '16px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    boxShadow: isSearched ? 'none' : '0 0 20px rgba(59, 130, 246, 0.7), inset 0 0 10px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  };

  const searchIconStyle = {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#3b82f6'
  };

  const filterPanelStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px',
    width: '180px',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 99
  };

  const filterTitleStyle = {
    fontSize: '12px',
    fontWeight: 800,
    marginBottom: '12px',
    color: '#fff'
  };

  const topicCheckboxStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const checkboxStyle = {
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  };

  const colorDotStyle = {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px'
  };

  const resultsContainerStyle = {
    marginTop: isSearched ? '100px' : '0px',
    padding: '20px',
    maxWidth: '1400px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 150px)',
    opacity: isSearched ? 1 : 0,
    transition: 'opacity 0.3s ease-in',
    pointerEvents: isSearched ? 'auto' : 'none'
  };

  const topicHeadingStyle = {
    fontSize: '20px',
    fontWeight: 800,
    marginTop: '30px',
    marginBottom: '15px',
    color: '#fff'
  };

  const channelHeadingStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#999',
    marginTop: '20px',
    marginBottom: '12px'
  };

  const videoGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  };

  const videoCardStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    display: 'flex',
    flexDirection: 'column'
  };

  const thumbnailStyle = {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    cursor: 'pointer'
  };

  const cardContentStyle = {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  };

  const titleStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  };

  const statsStyle = {
    fontSize: '11px',
    color: '#999',
    marginBottom: '8px'
  };

  const scoreStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 800,
    marginRight: '8px',
    marginBottom: '8px'
  };

  const buttonStyle = {
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '8px',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    backgroundColor: '#22c55e',
    color: '#fff'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
    fontSize: '18px'
  };

  const loadingStyle = {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#3b82f6',
    fontSize: '16px'
  };

  const toastStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: toast?.type === 'error' ? '#ef4444' : '#22c55e',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '6px',
    zIndex: 1000,
    fontSize: '12px',
    fontWeight: 800
  };

  // Calculate score
  const calcScore = (video) => {
    let score = 0;
    const views = video.views || 0;
    const likes = video.likes || 0;
    const title = video.title || '';

    // Views: max 40 points
    if (views > 1000000) score += 40;
    else if (views > 100000) score += 30;
    else if (views > 10000) score += 20;
    else score += 10;

    // Likes: max 30 points
    if (likes > 100000) score += 30;
    else if (likes > 10000) score += 20;
    else if (likes > 1000) score += 10;
    else score += 5;

    // Title length 40-70 chars: 15 points
    if (title.length >= 40 && title.length <= 70) score += 15;

    // Numbers in title: 15 points
    if (/\d/.test(title)) score += 15;

    return Math.min(score, 100);
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const formatCompact = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value;
  };

  return (
    <div style={contentStyle}>


      {/* Search Bar */}
      <div style={searchContainerStyle}>
        <div style={{ position: 'relative', width: '100%', height: isSearched ? '45px' : '55px' }}>
          <input
            type="text"
            placeholder="Search across your topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            style={searchInputStyle}
          />
          <div style={searchIconStyle} onClick={handleSearch}>
            🔍
          </div>
        </div>

        {!hasSearched && (
          <div style={{
            marginTop: '60px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <button
              onClick={() => {
                setSearchFields(prev => 
                  prev.includes('title') 
                    ? prev.filter(f => f !== 'title') 
                    : [...prev, 'title']
                );
              }}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: searchFields.includes('title') ? '#3b82f6' : '#333',
                color: '#fff'
              }}
            >
              Title
            </button>
            <button
              onClick={() => {
                setSearchFields(prev => 
                  prev.includes('description') 
                    ? prev.filter(f => f !== 'description') 
                    : [...prev, 'description']
                );
              }}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: searchFields.includes('description') ? '#3b82f6' : '#333',
                color: '#fff'
              }}
            >
              Description
            </button>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <div style={filterPanelStyle}>
        <div style={filterTitleStyle}>Filter</div>
        {allTopics.map((topic, idx) => (
          <label key={topic.id} style={topicCheckboxStyle}>
            <input
              type="checkbox"
              checked={selectedTopics.includes(topic.id)}
              onChange={() => toggleTopic(topic.id)}
              style={checkboxStyle}
            />
            <span style={colorDotStyle} style={{...colorDotStyle, backgroundColor: getTopicColor(idx)}}></span>
            {topic.name}
          </label>
        ))}
      </div>

      {/* Results */}
      <div style={resultsContainerStyle} id="resultsContainer">
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            padding: '40px 0'
          }}>
            <div className="dot" style={{ animationDelay: '0s' }}></div>
            <div className="dot" style={{ animationDelay: '0.2s' }}></div>
            <div className="dot" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}

        {!loading && isSearched && Object.keys(results).length === 0 && (
          <div style={emptyStateStyle}>No Videos Found</div>
        )}

        {!loading && isSearched && Object.keys(results).length > 0 && (
          Object.entries(results).map(([topicId, channels]) => {
            const topicName = allTopics.find(t => t.id === topicId)?.name;
            const topicIdx = allTopics.findIndex(t => t.id === topicId);
            const topicColor = getTopicColor(topicIdx);

            return (
              <div key={topicId}>
                <div style={{...topicHeadingStyle, color: topicColor}}>
                  {topicName}
                </div>

                {Object.entries(channels).map(([channelName, videos]) => (
                  <div key={channelName}>
                    {videos.length === 0 ? (
                      <div style={channelHeadingStyle}>{channelName} (No Videos)</div>
                    ) : (
                      <>
                        <div style={channelHeadingStyle}>{channelName}</div>
                        <div style={videoGridStyle}>
                          {videos.map((video) => {
                            const score = calcScore(video);
                            const scoreBgColor = getScoreBadgeColor(score);

                            return (
                              <div key={video.videoId} style={videoCardStyle}>
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  style={thumbnailStyle}
                                  onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                                />
                                <div style={cardContentStyle}>
                                  <div style={titleStyle}>{video.title}</div>
                                  <div style={statsStyle}>
                                    {formatCompact(video.views)} views · {formatCompact(video.likes)} likes · {formatCompact(video.commentCount)} comments
                                  </div>
                                  <div style={{marginBottom: '8px'}}>
                                    <span style={{...scoreStyle, backgroundColor: scoreBgColor}}>
                                      {score}%
                                    </span>
                                  </div>
                                  <button 
                                    style={buttonStyle}
                                    onClick={() => handleMoveToBrainstorm(video, topicId)}
                                  >
                                    Move to Brainstorm
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && <div style={toastStyle}>{toast.message}</div>}

      {/* Scrollbar styling */}
      <style>{`
        #resultsContainer::-webkit-scrollbar {
          width: 8px;
        }
        #resultsContainer::-webkit-scrollbar-track {
          background: transparent;
        }
        #resultsContainer::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        #resultsContainer::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .dot {
          width: 12px;
          height: 12px;
          background-color: #3b82f6;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
