import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import AddEventModal from '../components/AddEventModal';
import OutcomeModal from '../components/OutcomeModal';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`*, videos (id, title, thumbnail, youtube_video_id)`)
      .order('created_at', { ascending: false });
    if (!error) setEvents(data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event and its snapshots? Your trades will be kept.')) return;
    setDeletingId(eventId);
    const event = events.find(ev => ev.id === eventId);
    await supabase.from('snapshots').delete().eq('video_id', event?.video_id);
    await supabase.from('events').delete().eq('id', eventId);
    fetchEvents();
    setDeletingId(null);
  };

  const formatExpiry = (time) => new Date(time).toLocaleString();
  const isExpired = (time) => new Date(time) < new Date();

  const getOutcomeStyle = (outcome) => {
    if (outcome === 'YES') return { bg: '#003d1a', border: '#00c853', color: '#00c853', label: 'YES ✓' };
    if (outcome === 'NO') return { bg: '#3d0000', border: '#ff3131', color: '#ff3131', label: 'NO ✗' };
    return { bg: '#1a1a1a', border: '#b7c6c2', color: '#b7c6c2', label: 'PENDING' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#ff3131', borderBottom: '2px solid black', padding: '0 1rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ fontWeight: '800', fontSize: '1.25rem', color: 'white' }}>ViewStats</h1>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/performance')}
            style={{ padding: '0.4rem 0.75rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '3px 3px 0px 0px #000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; }}>
            Performance
          </button>
          <button onClick={() => navigate('/noa')}
            style={{ padding: '0.4rem 0.75rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '3px 3px 0px 0px #000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; }}>
            NOA
          </button>
          <button onClick={handleLogout}
            style={{ padding: '0.4rem 0.75rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '3px 3px 0px 0px #000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; }}>
            Logout
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a1a', borderTop: '2px solid black', display: 'flex', zIndex: 100, height: '60px' }}>
        {[
          { label: '🏠 Events', path: '/dashboard' },
          { label: '📈 Performance', path: '/performance' },
          { label: '🤖 NOA', path: '/noa' },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)}
            style={{ flex: 1, backgroundColor: item.path === '/dashboard' ? '#ff3131' : 'transparent', color: 'white', border: 'none', borderRight: i < 2 ? '1px solid #333' : 'none', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1rem', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#ff3131', fontWeight: '800', fontSize: '1.5rem' }}>Events</h2>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '0.6rem 1rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000', fontSize: '0.85rem' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}>
            + Add Event
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#ff3131', fontWeight: '700' }}>Loading events...</p>
        ) : events.length === 0 ? (
          <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', boxShadow: '8px 8px 0px 0px #ff3131', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '1.25rem' }}>No events yet</p>
            <p style={{ color: '#b7c6c2', marginTop: '0.5rem', fontSize: '0.9rem' }}>Click "Add Event" to start tracking</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {events.map(event => {
              const outcomeStyle = getOutcomeStyle(event.outcome);
              const deleting = deletingId === event.id;
              return (
                <div key={event.id} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', boxShadow: '6px 6px 0px 0px #ff3131', padding: '1rem', opacity: deleting ? 0.5 : 1, transition: 'all 0.2s' }}>

                  {/* Thumbnail */}
                  <div onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: 'pointer' }}>
                    {event.videos?.thumbnail && (
                      <img src={event.videos.thumbnail} alt={event.videos.title}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', border: '2px solid black', marginBottom: '0.75rem' }} />
                    )}
                    <p style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                      {event.videos?.title || 'Unknown Video'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#b7c6c2', fontSize: '0.8rem' }}>Target</span>
                    <span style={{ color: '#ff3131', fontWeight: '700', fontSize: '0.8rem' }}>{event.target_views?.toLocaleString()} views</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ color: '#b7c6c2', fontSize: '0.8rem' }}>Expiry</span>
                    <span style={{ color: isExpired(event.expiry_time) ? '#ff3131' : 'white', fontWeight: '600', fontSize: '0.8rem' }}>
                      {formatExpiry(event.expiry_time)}
                    </span>
                  </div>

                  {/* Outcome */}
                  <div style={{ backgroundColor: outcomeStyle.bg, border: `2px solid ${outcomeStyle.border}`, padding: '0.4rem', textAlign: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ color: outcomeStyle.color, fontWeight: '700', fontSize: '0.8rem' }}>
                      OUTCOME: {outcomeStyle.label}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                    <button onClick={() => navigate(`/event/${event.id}`)}
                      style={{ padding: '0.5rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.7rem', boxShadow: '2px 2px 0px 0px #ff3131' }}>
                      📊 Track
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowOutcomeModal(true); }}
                      style={{ padding: '0.5rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.7rem', boxShadow: '2px 2px 0px 0px #b7c6c2' }}>
                      🎯 Outcome
                    </button>
                    <button onClick={(e) => handleDelete(event.id, e)} disabled={deleting}
                      style={{ padding: '0.5rem', backgroundColor: '#3d0000', color: '#ff3131', border: '2px solid #ff3131', fontWeight: '700', cursor: 'pointer', fontSize: '0.7rem' }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <AddEventModal onClose={() => setShowModal(false)} onEventAdded={fetchEvents} />}
      {showOutcomeModal && selectedEvent && (
        <OutcomeModal
          event={selectedEvent}
          onClose={() => { setShowOutcomeModal(false); setSelectedEvent(null); }}
          onUpdated={fetchEvents}
        />
      )}
    </div>
  );
}