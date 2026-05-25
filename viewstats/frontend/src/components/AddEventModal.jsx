import { useState } from 'react';
import supabase from '../lib/supabase';
import axios from 'axios';

export default function AddEventModal({ onClose, onEventAdded }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetViews, setTargetViews] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) { setError('Invalid YouTube URL'); setLoading(false); return; }
    if (!targetViews || !expiryDate || !expiryTime) { setError('Please fill all fields'); setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const expiryDateTime = new Date(`${expiryDate}T${expiryTime}`).toISOString();

      let { data: video } = await supabase
        .from('videos').select('*').eq('youtube_video_id', videoId).single();

      if (!video) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await axios.get(`${backendUrl}/api/youtube/video/${videoId}`);
        const videoData = response.data;
        const { data: newVideo, error: videoError } = await supabase
          .from('videos')
          .insert({ youtube_url: youtubeUrl, youtube_video_id: videoId, title: videoData.title, thumbnail: videoData.thumbnail })
          .select().single();
        if (videoError) throw videoError;
        video = newVideo;
      }

      const { error: eventError } = await supabase.from('events').insert({
        video_id: video.id,
        target_views: parseInt(targetViews),
        expiry_time: expiryDateTime,
        created_by: user.id
      });

      if (eventError) throw eventError;
      onEventAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#0a0a0a', border: '2px solid #ff3131', boxShadow: '8px 8px 0px 0px #ff3131', padding: '2rem', width: '520px', maxWidth: '90vw' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #ff3131' }}>
          <div>
            <h2 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>Add New Event</h2>
            <p style={{ color: '#b7c6c2', fontSize: '0.85rem', marginTop: '0.25rem' }}>Track a YouTube video prediction</p>
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* YouTube URL */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YouTube URL</label>
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            style={{ width: '100%', padding: '0.875rem', border: '2px solid #333', backgroundColor: '#1a1a1a', fontSize: '0.95rem', boxSizing: 'border-box', color: 'white', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#ff3131'}
            onBlur={e => e.target.style.borderColor = '#333'}
          />
        </div>

        {/* Target Views */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Views</label>
          <input
            type="number"
            placeholder="e.g. 500000"
            value={targetViews}
            onChange={e => setTargetViews(e.target.value)}
            style={{ width: '100%', padding: '0.875rem', border: '2px solid #333', backgroundColor: '#1a1a1a', fontSize: '0.95rem', boxSizing: 'border-box', color: 'white', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#ff3131'}
            onBlur={e => e.target.style.borderColor = '#333'}
          />
        </div>

        {/* Expiry — separate date and time */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Date</p>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '0.875rem', border: '2px solid #333', backgroundColor: '#1a1a1a', fontSize: '0.95rem', boxSizing: 'border-box', color: 'white', outline: 'none', colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />
            </div>
            <div>
              <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Time</p>
              <input
                type="time"
                value={expiryTime}
                onChange={e => setExpiryTime(e.target.value)}
                style={{ width: '100%', padding: '0.875rem', border: '2px solid #333', backgroundColor: '#1a1a1a', fontSize: '0.95rem', boxSizing: 'border-box', color: 'white', outline: 'none', colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#1a0000', border: '2px solid #ff3131', padding: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ color: '#ff3131', fontSize: '0.875rem', fontWeight: '600' }}>⚠ {error}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.875rem', backgroundColor: 'transparent', color: 'white', border: '2px solid #333', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '0.875rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
          >
            {loading ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}