import React, { useState, useEffect, useRef } from 'react';

const AISummary = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');

  const summaryRef = useRef(null);

  const styles = {
    container: {
      backgroundColor: '#0f0f0f',
      minHeight: '100vh',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '800',
      marginBottom: '40px',
      background: 'linear-gradient(45deg, #3b82f6, #22c55e)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    inputWrapper: {
      width: '100%',
      maxWidth: '800px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #333',
      padding: '4px 8px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      marginBottom: '24px',
    },
    input: {
      flex: 1,
      backgroundColor: 'transparent',
      border: 'none',
      color: '#fff',
      fontSize: '1.1rem',
      padding: '14px 16px',
      outline: 'none',
    },
    submitButton: {
      backgroundColor: '#22c55e',
      border: 'none',
      borderRadius: '8px',
      color: '#fff',
      padding: '10px 20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      transition: 'opacity 0.2s',
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      marginTop: '40px',
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255, 255, 255, 0.1)',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    summaryCard: {
      width: '100%',
      maxWidth: '800px',
      backgroundColor: '#1a1a1a',
      borderRadius: '16px',
      padding: '30px',
      position: 'relative',
      maxHeight: '70vh',
      overflowY: 'auto',
      border: '1px solid #333',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
    },
    copyButton: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      backgroundColor: '#3b82f6',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '0.85rem',
      cursor: 'pointer',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    resetButton: {
      marginTop: '24px',
      backgroundColor: 'transparent',
      border: '1px solid #333',
      color: '#999',
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    manualContainer: {
      width: '100%',
      maxWidth: '800px',
      marginTop: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    textarea: {
      width: '100%',
      height: '200px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      color: '#fff',
      padding: '16px',
      fontSize: '1rem',
      resize: 'none',
      outline: 'none',
    },
    errorToast: {
      backgroundColor: '#ef444422',
      border: '1px solid #ef4444',
      color: '#ef4444',
      padding: '12px 24px',
      borderRadius: '8px',
      marginBottom: '20px',
    }
  };

  const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : false;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    // Simple feedback could be added here
  };

  const handleReset = () => {
    setUrl('');
    setSummary('');
    setTranscript('');
    setError('');
    setShowManualPaste(false);
    setManualTranscript('');
  };

  const fetchTranscript = async (videoId) => {
    try {
      // In a real browser environment, this might face CORS issues if not proxied.
      // But we follow the prompt's instruction to use this specific URL.
      const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`);
      if (!response.ok) throw new Error('Failed to fetch transcript');
      
      const text = await response.text();
      // Simple parser for YouTube XML transcript
      if (text.includes('<text')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const lines = xmlDoc.getElementsByTagName("text");
        let transcriptText = "";
        for (let i = 0; i < lines.length; i++) {
          transcriptText += lines[i].textContent + " ";
        }
        return transcriptText.trim();
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const generateSummary = async (textToSummarize) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const prompt = `You are a YouTube video summarizer.
Analyze this transcript and create a formatted summary.
IF video is about PRODUCTS or LISTS (e.g., "10 summer products"):
Format as:

[Product Name] - [One line description]
• [Key point 1]
• [Key point 2]
• [Key point 3]

IF video is about TUTORIAL or HOW-TO:
Format as:

[Step Name]
[Description with 2-3 bullet points or sentences]

IF video is about GENERAL CONTENT:
Format as natural paragraphs with clear sections.
Transcript:
${textToSummarize}
Return ONLY the formatted summary, no preamble.`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error('Gemini API Error');
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('❌ Invalid YouTube URL');
      return;
    }

    setLoading(true);
    setLoadingMessage('Getting transcript & summarizing...');
    
    // Artificial 3 sec delay as requested for the message to be visible
    const delay = new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const fetchedTranscript = await fetchTranscript(videoId);
      await delay;

      if (!fetchedTranscript) {
        setLoading(false);
        setShowManualPaste(true);
        return;
      }

      setTranscript(fetchedTranscript);
      const generatedSummary = await generateSummary(fetchedTranscript);
      setSummary(generatedSummary);
    } catch (err) {
      setError('❌ Failed to summarize. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualTranscript.trim()) return;
    
    setLoading(true);
    setLoadingMessage('Summarizing transcript...');
    setError('');

    try {
      const generatedSummary = await generateSummary(manualTranscript);
      setSummary(generatedSummary);
      setShowManualPaste(false);
    } catch (err) {
      setError('❌ Failed to summarize. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>AI Video Summary</h1>

      {error && <div style={styles.errorToast}>{error}</div>}

      {!summary && !loading && !showManualPaste && (
        <form onSubmit={handleSubmit} style={styles.inputWrapper}>
          <input 
            style={styles.input}
            type="text"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={(e) => e.target.parentElement.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.parentElement.style.borderColor = '#333'}
          />
          <button type="submit" style={styles.submitButton}>
            🔍 Summarize
          </button>
        </form>
      )}

      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{color: '#999'}}>{loadingMessage}</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {showManualPaste && !loading && !summary && (
        <div style={styles.manualContainer}>
          <p style={{color: '#ef4444', fontWeight: '600'}}>❌ No transcript found. Please paste transcript manually below</p>
          <textarea 
            style={styles.textarea}
            placeholder="Paste transcript here..."
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
          />
          <button 
            onClick={handleManualSubmit}
            style={{...styles.submitButton, alignSelf: 'flex-end'}}
          >
            Generate Summary
          </button>
          <button onClick={handleReset} style={{...styles.resetButton, marginTop: '8px'}}>
            Cancel
          </button>
        </div>
      )}

      {summary && !loading && (
        <>
          <div style={styles.summaryCard} ref={summaryRef}>
            <button onClick={handleCopy} style={styles.copyButton}>
              📋 Copy
            </button>
            <div style={{color: '#fff', fontSize: '1.05rem'}}>
              {summary}
            </div>
          </div>
          <button onClick={handleReset} style={styles.resetButton}>
            🔍 Search Again
          </button>
        </>
      )}
    </div>
  );
};

export default AISummary;
