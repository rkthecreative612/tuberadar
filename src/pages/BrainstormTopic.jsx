/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../lib/supabase';

// 4. Create brainstorm_items table in Supabase if not exists:
// Table needs: id, topic_id (uuid), video_id (text), title (text), thumbnail (text), likes (text), comments (text), score (text), description (text), created_at

// 5. Create planner_items table structure in comments:
// Table needs: id, topic_id (uuid), title (text), description (text), bound_video_ids (jsonb), created_at

const containerStyle = {
  display: 'flex',
  width: '100%',
  flex: 1,
  overflow: 'hidden',
  backgroundColor: '#0f0f0f',
  color: 'white',
  fontFamily: 'sans-serif'
};

const leftPanelStyle = {
  width: '280px',
  backgroundColor: '#111',
  borderRight: '1px solid #222',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0
};

const panelTitleStyle = {
  fontSize: '12px',
  color: '#888',
  textTransform: 'uppercase',
  padding: '24px 20px 16px 20px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: 0
};

const listItemStyle = (isSelected) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  cursor: 'pointer',
  backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
  color: isSelected ? '#fff' : '#ccc',
  transition: 'all 0.2s',
  fontSize: '14px',
  userSelect: 'none'
});

const centerPanelStyle = {
  flex: 1,
  padding: '24px',
  maxHeight: '90vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#0f0f0f',
};

const rightPanelStyle = {
  width: '300px',
  backgroundColor: '#111',
  borderLeft: '1px solid #222',
  overflowY: 'auto',
  padding: '20px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const BrainstormTopic = ({ topic: topicProp }) => {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [topic, setTopic] = useState(topicProp ?? null);

  const [expandedSection, setExpandedSection] = useState(null);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [plannerErrors, setPlannerErrors] = useState({ title: '', description: '' });
  const [boundVideos, setBoundVideos] = useState([]);
  const [showBindDropdown, setShowBindDropdown] = useState(false);
  const [showPlannerSuccess, setShowPlannerSuccess] = useState(false);

  useEffect(() => {
    if (topicProp) return;
    if (!topicId) return;

    let alive = true;
    const fetchTopic = async () => {
      const { data, error } = await supabase.from('my_channels').select('*').eq('id', topicId).maybeSingle();
      if (!alive) return;
      if (!error && data) setTopic(data);
    };

    fetchTopic();
    return () => { alive = false; };
  }, [topicId, topicProp]);

  useEffect(() => {
    if (!topic) return;
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('brainstorm_items')
        .select('*')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Normalize shape so the UI can rely on `commentCount` even if older rows only have `comments`.
        const normalized = (data || []).map((row) => ({
          ...row,
          commentCount: row?.commentCount ?? row?.comments ?? 0,
        }))

        setVideos(normalized);
        if (data.length > 0) {
          setSelectedVideo(normalized[0]);
        }
      }
    };
    fetchVideos();
  }, [topic]);

  useEffect(() => {
    if (selectedVideo && boundVideos.length === 0 && !ideaTitle && !ideaDescription) {
      setBoundVideos([selectedVideo]);
    }
  }, [selectedVideo]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const newVideos = videos.filter(v => v.id !== id);
    setVideos(newVideos);
    setBoundVideos(b => b.filter(bv => bv.id !== id));

    if (selectedVideo?.id === id) {
      setSelectedVideo(newVideos.length > 0 ? newVideos[0] : null);
    }
    await supabase.from('brainstorm_items').delete().eq('id', id);
  };

  const truncate = (str, n) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  const currentTitle = selectedVideo?.title || selectedVideo?.video_title || 'Untitled';
  // Keep the textarea value as the real description; show "No description available" as placeholder instead.
  const descriptionText = selectedVideo?.description ?? '';
  const tagsText = currentTitle.split(' ').filter(w => w.length > 3).join(', ');

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const renderGrabber = (id, label, content) => {
    const isExpanded = expandedSection === id;
    const safeContent = content ?? '';
    return (
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={() => {
            if (id === 'thumbnail') {
              window.open(`https://img.youtube.com/vi/${selectedVideo.video_id}/maxresdefault.jpg`, '_blank');
              return;
            }
            if (id === 'summary') {
              setExpandedSection(isExpanded ? null : id);
              return;
            }
            setExpandedSection(isExpanded ? null : id);
          }}
          style={{
            width: '100%',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 'bold'
          }}
        >
          {label}
        </button>
        {isExpanded && id !== 'thumbnail' && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {id === 'summary' ? (
              <div style={{ color: '#aaa', padding: '10px', fontSize: '14px', fontStyle: 'italic' }}>Coming soon — AI Summary</div>
            ) : (
              <>
                <textarea
                  readOnly
                  value={safeContent}
                  placeholder={id === 'description' ? 'No description available' : ''}
                  style={{
                    width: '100%',
                    height: '80px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '8px',
                    boxSizing: 'border-box',
                    fontFamily: 'sans-serif'
                  }}
                />
                <button
                  onClick={() => handleCopy(safeContent)}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 16px',
                    backgroundColor: '#fff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  Copy
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleMoveToPlanner = async () => {
    const activeTopicId = topic?.id || topicId;
    if (!activeTopicId) return;

    const nextErrors = {
      title: ideaTitle.trim() ? '' : 'Title is required',
      description: ideaDescription.trim() ? '' : 'Description is required',
    };

    setPlannerErrors(nextErrors);
    if (nextErrors.title || nextErrors.description) return;

    try {
      const binded = (boundVideos || []).map((v) => {
        const vid = v?.video_id || v?.videoId || v?.id;
        return {
          video_id: vid,
          title: v?.title || v?.video_title || '',
          thumbnail: v?.thumbnail || (vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : ''),
          video_link: vid ? `https://www.youtube.com/watch?v=${vid}` : '',
        };
      });

      const { error } = await supabase.from('planner_videos').insert({
        topic_id: activeTopicId,
        video_title: ideaTitle.trim(),
        video_description: ideaDescription.trim(),
        binded_videos: binded,
        notes: '',
        position: 0,
      });

      if (error) throw error;

      // Delete the brainstorm_items entry
      await supabase.from('brainstorm_items').delete().eq('id', selectedVideo.id);

      // Remove from local state
      const remainingVideos = videos.filter(v => v.id !== selectedVideo.id);
      setVideos(remainingVideos);
      setSelectedVideo(remainingVideos.length > 0 ? remainingVideos[0] : null);

      setShowPlannerSuccess(true);
      setTimeout(() => setShowPlannerSuccess(false), 3000);
      setIdeaTitle('');
      setIdeaDescription('');
      setPlannerErrors({ title: '', description: '' });
      setBoundVideos(remainingVideos.length > 0 ? [remainingVideos[0]] : []);
    } catch (err) {
      console.error('Error moving to planner:', err);
      alert('❌ Failed to move to planner');
    }
  };

  return (
    <div style={containerStyle}>
      {/* LEFT PANEL */}
      <div style={leftPanelStyle}>
        <h3 style={panelTitleStyle}>Videos</h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {videos.map(video => {
            const isSelected = selectedVideo?.id === video.id;
            const t = video.title || video.video_title || 'Untitled Video';
            return (
              <div key={video.id} style={listItemStyle(isSelected)} onClick={() => setSelectedVideo(video)}>
                <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }} title={t}>
                  {truncate(t, 35)}
                </div>
                <div
                  onClick={(e) => handleDelete(e, video.id)}
                  style={{ cursor: 'pointer', opacity: 0.6, padding: '4px', marginLeft: '8px' }}
                  onMouseEnter={(e) => e.target.style.opacity = 1}
                  onMouseLeave={(e) => e.target.style.opacity = 0.6}
                  title="Delete Video"
                >
                  &#128465;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL */}
      <div style={centerPanelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/brainstorm')}
            style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          >
            &larr; Back to Brainstormer
          </button>
          {selectedVideo && (
            <button
              onClick={(e) => handleDelete(e, selectedVideo.id)}
              style={{ background: 'transparent', border: '1px solid #444', color: '#ff5252', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              Delete
            </button>
          )}
        </div>

        {selectedVideo ? (
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <img
              src={`https://img.youtube.com/vi/${selectedVideo.video_id}/maxresdefault.jpg`}
              onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedVideo.video_id}`, '_blank')}
              style={{
                width: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "8px",
                marginBottom: "10px",
                cursor: 'pointer',
              }}
            />
            <h2 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', margin: '0 0 16px 0' }}>
              {currentTitle}
            </h2>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#1a1a1a', padding: '6px 14px', borderRadius: '20px', color: '#aaa', fontSize: '13px' }}>
                &#128077; Likes: {(Number(selectedVideo.likes) || 0).toLocaleString()}
              </div>
              <div style={{ background: '#1a1a1a', padding: '6px 14px', borderRadius: '20px', color: '#aaa', fontSize: '13px' }}>
                &#128172; Comments: {(selectedVideo?.commentCount || 0).toLocaleString()}
              </div>
              <div style={{ background: '#1a1a1a', padding: '6px 14px', borderRadius: '20px', color: '#aaa', fontSize: '13px' }}>
                &#11088; Score: {selectedVideo.score || 0}%
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderGrabber('thumbnail', '🖼 Thumbnail', null)}
              {renderGrabber('title', '📝 Title Grabber', currentTitle)}
              {renderGrabber('description', '📄 Description Grabber', descriptionText)}
              {renderGrabber('tags', '🏷 Tags', tagsText)}
              {renderGrabber('summary', '✨ Summary', null)}
            </div>
          </div>
        ) : (
          <div style={{ margin: 'auto', color: '#666' }}>Select a video</div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={rightPanelStyle}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>Title</label>
          <textarea
            value={ideaTitle}
            onChange={(e) => {
              setIdeaTitle(e.target.value);
              if (plannerErrors.title) setPlannerErrors((p) => ({ ...p, title: '' }));
            }}
            placeholder="Write your video title idea..."
            style={{ width: '100%', height: '60px', background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: '8px', padding: '10px', boxSizing: 'border-box', fontFamily: 'sans-serif', resize: 'none' }}
          />
          {plannerErrors.title ? (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
              {plannerErrors.title}
            </div>
          ) : null}
        </div>

        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>Description</label>
          <textarea
            value={ideaDescription}
            onChange={(e) => {
              setIdeaDescription(e.target.value);
              if (plannerErrors.description) setPlannerErrors((p) => ({ ...p, description: '' }));
            }}
            placeholder="Write your description idea..."
            style={{ width: '100%', height: '120px', background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: '8px', padding: '10px', boxSizing: 'border-box', fontFamily: 'sans-serif', resize: 'none' }}
          />
          {plannerErrors.description ? (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
              {plannerErrors.description}
            </div>
          ) : null}
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '12px', marginBottom: '8px' }}>
            Videos <span style={{ color: '#ff5252', fontSize: '10px' }}>Selected video is bound by default</span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {boundVideos.map(bv => (
              <div key={bv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', border: '1px solid #333', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                <span title={bv.title || bv.video_title} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                  {truncate(bv.title || bv.video_title || 'Untitled', 25)}
                </span>
                <span onClick={() => setBoundVideos(l => l.filter(x => x.id !== bv.id))} style={{ cursor: 'pointer', color: '#888' }}>&times;</span>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBindDropdown(!showBindDropdown)}
              style={{ width: '100%', background: 'transparent', border: '1px dashed #555', color: '#ccc', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              + Bind video
            </button>
            {showBindDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#222', border: '1px solid #444', borderRadius: '6px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                {videos.filter(v => !boundVideos.some(bv => bv.id === v.id)).map(v => (
                  <div
                    key={v.id}
                    onClick={() => { setBoundVideos([...boundVideos, v]); setShowBindDropdown(false); }}
                    style={{ padding: '8px', fontSize: '12px', borderBottom: '1px solid #333', cursor: 'pointer' }}
                  >
                    {truncate(v.title || v.video_title || 'Untitled', 30)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button
            onClick={handleMoveToPlanner}
            style={{ width: '100%', background: '#e00', color: 'white', fontWeight: 'bold', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Move to Planner
          </button>
          {showPlannerSuccess && (
            <div style={{ color: '#4caf50', textAlign: 'center', marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>
              ✅ Moved to Planner
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainstormTopic;
