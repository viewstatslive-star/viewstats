import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import supabase from '../lib/supabase';
import axios from 'axios';

export default function Event() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [activeTab, setActiveTab] = useState('raw');
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ hours: 0, mins: 0, secs: 0 });
  const lastViewsRef = useRef(null);
  const eventRef = useRef(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (!event) return;
    eventRef.current = event;
    fetchSnapshots();
    takeSnapshot();
    const snapshotInterval = setInterval(takeSnapshot, 10000);
    return () => clearInterval(snapshotInterval);
  }, [event]);

  // Separate countdown timer
  useEffect(() => {
    if (!event) return;
    const timer = setInterval(() => {
      const now = new Date();
      const expiry = new Date(event.expiry_time);
      const diff = expiry - now;
      if (diff <= 0) {
        setCountdown({ hours: 0, mins: 0, secs: 0 });
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown({ hours, mins, secs });
    }, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`*, videos (*)`)
      .eq('id', id)
      .single();
    if (!error) setEvent(data);
    setLoading(false);
  };

  const fetchSnapshots = async () => {
    const { data } = await supabase
      .from('snapshots')
      .select('*')
      .eq('video_id', eventRef.current.video_id)
      .order('timestamp', { ascending: false })
      .limit(1000);
    if (data) setSnapshots(data);
  };

  const takeSnapshot = async () => {
    try {
      const currentEvent = eventRef.current;
      if (!currentEvent) return;
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/api/youtube/video/${currentEvent.videos.youtube_video_id}`);
      const currentViews = response.data.views;

      if (lastViewsRef.current === currentViews) return;

      const { data: lastSnapshot } = await supabase
        .from('snapshots')
        .select('*')
        .eq('video_id', currentEvent.video_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const gainedLost = lastSnapshot ? currentViews - lastSnapshot.total_views : 0;

      if (gainedLost !== 0 || !lastSnapshot) {
        await supabase.from('snapshots').insert({
          video_id: currentEvent.video_id,
          total_views: currentViews,
          gained_lost: gainedLost
        });
        lastViewsRef.current = currentViews;
        fetchSnapshots();
      }
    } catch (err) {
      console.error('Snapshot error:', err);
    }
  };

  const calculateMetrics = () => {
    if (!event || snapshots.length === 0) return null;

    const latestSnapshot = snapshots[0];
    const currentViews = latestSnapshot.total_views;
    const targetViews = event.target_views;

    const viewsNeeded = Math.max(0, targetViews - currentViews);

    // Time normalized avg — only views gained since first snapshot
    const oldestSnapshot = snapshots[snapshots.length - 1];
    const firstViews = oldestSnapshot.total_views;
    const viewsGainedSinceStart = currentViews - firstViews;
    const hoursTracked = Math.max(0.01, (new Date() - new Date(oldestSnapshot.timestamp)) / 3600000);
    const timeNormalizedAvg = Math.round(viewsGainedSinceStart / hoursTracked);

    // Required 5 min avg
    const timeLeftMs = new Date(event.expiry_time) - new Date();
    const timeLeftMinutes = Math.max(0, timeLeftMs / 60000);
    const remainingIntervals = Math.max(1, timeLeftMinutes / 5);
    const required5MinAvg = Math.round(viewsNeeded / remainingIntervals);

    // Actual 5 min avg (last 6 intervals)
    const fiveMinData = get5MinSnapshots();
    const last6 = fiveMinData.slice(0, 6);
    const actual5MinAvg = last6.length > 0
      ? Math.round(last6.reduce((sum, s) => sum + Math.abs(s.gained_lost), 0) / last6.length)
      : 0;

    const difference = actual5MinAvg - required5MinAvg;

    return {
      currentViews,
      targetViews,
      viewsNeeded,
      timeNormalizedAvg,
      required5MinAvg,
      actual5MinAvg,
      difference
    };
  };

  const get5MinSnapshots = () => {
    if (snapshots.length === 0) return [];
    const buckets = {};
    snapshots.forEach(s => {
      const date = new Date(s.timestamp);
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const bucketMinutes = Math.ceil(totalMinutes / 5) * 5;
      const bucketHour = Math.floor(bucketMinutes / 60) % 24;
      const bucketMin = bucketMinutes % 60;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${bucketHour}-${bucketMin}`;
      if (!buckets[key]) {
        const displayDate = new Date(date);
        displayDate.setHours(bucketHour, bucketMin, 0, 0);
        buckets[key] = { timestamp: displayDate.toISOString(), snapshots: [] };
      }
      buckets[key].snapshots.push(s);
    });

    const sortedBuckets = Object.values(buckets).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    sortedBuckets.forEach((bucket, i) => {
      const maxViews = Math.max(...bucket.snapshots.map(s => s.total_views));
      bucket.total_views = maxViews;
      if (i < sortedBuckets.length - 1) {
        const prevMax = Math.max(...sortedBuckets[i + 1].snapshots.map(s => s.total_views));
        bucket.gained_lost = maxViews - prevMax;
      } else {
        const minViews = Math.min(...bucket.snapshots.map(s => s.total_views));
        bucket.gained_lost = maxViews - minViews;
      }
    });

    return sortedBuckets;
  };

  const getHourlySnapshots = () => {
    if (snapshots.length === 0) return [];
    const buckets = {};
    snapshots.forEach(s => {
      const date = new Date(s.timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      if (!buckets[key]) {
        buckets[key] = { timestamp: s.timestamp, snapshots: [] };
      }
      buckets[key].snapshots.push(s);
    });

    const sortedBuckets = Object.values(buckets).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    sortedBuckets.forEach((bucket, i) => {
      const maxViews = Math.max(...bucket.snapshots.map(s => s.total_views));
      bucket.total_views = maxViews;
      if (i < sortedBuckets.length - 1) {
        const prevMax = Math.max(...sortedBuckets[i + 1].snapshots.map(s => s.total_views));
        bucket.gained_lost = maxViews - prevMax;
      } else {
        const minViews = Math.min(...bucket.snapshots.map(s => s.total_views));
        bucket.gained_lost = maxViews - minViews;
      }
    });

    return sortedBuckets;
  };

  const formatTime12 = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatHour12 = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  const metrics = calculateMetrics();

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ff3131', fontSize: '1.5rem', fontWeight: '700' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#ff3131', borderBottom: '2px solid black', padding: '0 2rem', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>ViewStats</h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
        >
          ← Back
        </button>
      </div>

      {/* Video Info Bar */}
      <div style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid black', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {event?.videos?.thumbnail && (
          <img src={event.videos.thumbnail} alt="" style={{ height: '60px', border: '2px solid black' }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>{event?.videos?.title}</p>
          <p style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>Target: {event?.target_views?.toLocaleString()} views</p>
        </div>
        {/* Countdown */}
        <div style={{ backgroundColor: '#0a0a0a', border: '2px solid #ff3131', padding: '0.75rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#b7c6c2', fontSize: '0.7rem', fontWeight: '600', marginBottom: '0.25rem' }}>TIME LEFT</p>
          <p style={{ color: '#ff3131', fontWeight: '800', fontSize: '1.5rem', fontFamily: 'monospace' }}>
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.mins).padStart(2, '0')}:{String(countdown.secs).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>

        {/* LEFT — Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ color: '#ff3131', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem' }}>METRICS</h3>
          {[
            { label: '#1 Current Views', value: metrics?.currentViews?.toLocaleString(), color: 'white' },
            { label: '#3 Target', value: metrics?.targetViews?.toLocaleString(), color: 'white' },
            { label: '#4 Views Needed', value: metrics?.viewsNeeded?.toLocaleString(), color: '#ff3131' },
            { label: '#5 Time Norm. Avg/hr', value: metrics?.timeNormalizedAvg?.toLocaleString(), color: '#b7c6c2' },
            { label: '#6 Required 5-min Avg', value: metrics?.required5MinAvg?.toLocaleString(), color: '#ff3131' },
            { label: '#7 Actual 5-min Avg', value: metrics?.actual5MinAvg?.toLocaleString(), color: '#00c853' },
            { label: '#8 Difference', value: metrics ? (metrics.difference >= 0 ? '+' : '') + metrics.difference?.toLocaleString() : '--', color: metrics?.difference >= 0 ? '#00c853' : '#ff3131' },
          ].map((metric, i) => (
            <div key={i} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#b7c6c2', fontSize: '0.8rem', fontWeight: '600' }}>{metric.label}</span>
              <span style={{ color: metric.color, fontWeight: '700', fontSize: '0.9rem' }}>{metric.value || '--'}</span>
            </div>
          ))}
        </div>

        {/* RIGHT — Intervals */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {['raw', '5min', 'hourly'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: activeTab === tab ? '#ff3131' : '#1a1a1a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: activeTab === tab ? 'none' : '4px 4px 0px 0px #ff3131' }}
              >
                {tab === 'raw' ? 'Raw' : tab === '5min' ? '5 Min' : 'Hourly'}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', backgroundColor: '#ff3131', padding: '0.75rem 1rem', borderBottom: '2px solid black' }}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>TIME</span>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>TOTAL VIEWS</span>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>GAINED/LOST</span>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {(activeTab === 'raw' ? snapshots : activeTab === '5min' ? get5MinSnapshots() : getHourlySnapshots()).map((snap, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #333', backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#111' }}>
                  <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>
                    {activeTab === 'hourly' ? formatHour12(snap.timestamp) : formatTime12(snap.timestamp)}
                  </span>
                  <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600' }}>
                    {snap.total_views?.toLocaleString()}
                  </span>
                  <span style={{ color: snap.gained_lost >= 0 ? '#00c853' : '#ff3131', fontSize: '0.85rem', fontWeight: '700' }}>
                    {snap.gained_lost >= 0 ? '+' : ''}{snap.gained_lost?.toLocaleString()}
                  </span>
                </div>
              ))}
              {snapshots.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: '#b7c6c2' }}>Waiting for view changes...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}