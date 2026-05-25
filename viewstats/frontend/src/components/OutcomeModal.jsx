import { useState } from 'react';
import supabase from '../lib/supabase';

export default function OutcomeModal({ event, onClose, onUpdated }) {
  const [outcome, setOutcome] = useState(event.outcome || 'PENDING');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await supabase
      .from('events')
      .update({ outcome })
      .eq('id', event.id);
    onUpdated();
    onClose();
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#0a0a0a', border: '2px solid #ff3131', boxShadow: '8px 8px 0px 0px #ff3131', padding: '2rem', width: '400px', maxWidth: '90vw' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #ff3131' }}>
          <div>
            <h2 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>Set Outcome</h2>
            <p style={{ color: '#b7c6c2', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {event.videos?.title?.substring(0, 40)}...
            </p>
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: '700', color: 'white' }}>✕</button>
        </div>

        {/* Target Info */}
        <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>Target: <span style={{ color: 'white', fontWeight: '700' }}>{event.target_views?.toLocaleString()} views</span></p>
          <p style={{ color: '#b7c6c2', fontSize: '0.85rem', marginTop: '0.25rem' }}>Expiry: <span style={{ color: 'white', fontWeight: '700' }}>{new Date(event.expiry_time).toLocaleString()}</span></p>
        </div>

        {/* Outcome Buttons */}
        <p style={{ color: '#b7c6c2', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Did the video hit the target?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { value: 'YES', label: 'YES ✓', color: '#00c853' },
            { value: 'NO', label: 'NO ✗', color: '#ff3131' },
            { value: 'PENDING', label: 'PENDING', color: '#b7c6c2' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              style={{
                padding: '1rem',
                backgroundColor: outcome === opt.value ? opt.color : '#1a1a1a',
                color: 'white',
                border: `2px solid ${opt.color}`,
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: outcome === opt.value ? 'none' : `4px 4px 0px 0px ${opt.color}`
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

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
            style={{ padding: '0.875rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
          >
            {loading ? 'Saving...' : 'Save Outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}