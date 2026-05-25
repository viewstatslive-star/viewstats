import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function AddTradeModal({ onClose, onTradeAdded }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [entries, setEntries] = useState([{ side: 'YES', buy_price: '', quantity: '', sell_price: '' }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select(`*, videos (title)`)
      .order('created_at', { ascending: false });
    if (data) setEvents(data);
  };

  const addEntry = () => {
    setEntries([...entries, { side: 'YES', buy_price: '', quantity: '', sell_price: '' }]);
  };

  const removeEntry = (index) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const calculateResults = () => {
    let grossProfit = 0;
    entries.forEach(e => {
      if (e.buy_price && e.sell_price && e.quantity) {
        const entryProfit = (parseFloat(e.sell_price) - parseFloat(e.buy_price)) * parseFloat(e.quantity);
        grossProfit += entryProfit;
      }
    });
    const commission = grossProfit > 0 ? grossProfit * 0.15 : 0;
    const netProfit = grossProfit - commission;
    return { grossProfit, commission, netProfit };
  };

  const calculateRR = () => {
  let totalInvested = 0;
  let totalProfit = 0;
  entries.forEach(e => {
    if (e.buy_price && e.sell_price && e.quantity) {
      const invested = parseFloat(e.buy_price) * parseFloat(e.quantity);
      const profit = (parseFloat(e.sell_price) - parseFloat(e.buy_price)) * parseFloat(e.quantity);
      totalInvested += invested;
      totalProfit += profit;
    }
  });
  return totalInvested > 0 ? totalProfit / totalInvested : 0;
};

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (!selectedEvent) { setError('Please select an event'); setLoading(false); return; }
    if (entries.some(e => !e.buy_price || !e.quantity || !e.sell_price)) {
      setError('Please fill all entry fields including sell price');
      setLoading(false);
      return;
    }

    // Validate prices
    for (const e of entries) {
      const buy = parseFloat(e.buy_price);
      const sell = parseFloat(e.sell_price);
      if (buy < 0.5 || buy > 9.5) { setError('Buy price must be between 0.5 and 9.5'); setLoading(false); return; }
      if (sell < 0 || sell > 10) { setError('Sell price must be between 0 and 10'); setLoading(false); return; }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { grossProfit, commission, netProfit } = calculateResults();
      const riskReward = calculateRR();

      const { error: tradeError } = await supabase.from('trades').insert({
        user_id: user.id,
        event_id: selectedEvent,
        entries: entries,
        commission: commission,
        final_profit: netProfit,
        risk_reward: riskReward,
        notes: notes
      });

      if (tradeError) throw tradeError;
      onTradeAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const { grossProfit, commission, netProfit } = calculateResults();

  const inputStyle = {
    width: '100%',
    padding: '0.625rem',
    border: '2px solid #333',
    backgroundColor: '#0a0a0a',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const priceOptions = [];
  for (let i = 0.5; i <= 9.5; i += 0.5) {
    priceOptions.push(i.toFixed(1));
  }

  const sellPriceOptions = [];
  for (let i = 0; i <= 10; i += 0.5) {
    sellPriceOptions.push(i.toFixed(1));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#0a0a0a', border: '2px solid #ff3131', boxShadow: '8px 8px 0px 0px #ff3131', padding: '2rem', width: '650px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #ff3131' }}>
          <div>
            <h2 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>Add Trade</h2>
            <p style={{ color: '#b7c6c2', fontSize: '0.85rem', marginTop: '0.25rem' }}>Commission: 15% of profit only</p>
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: '700', color: 'white' }}>✕</button>
        </div>

        {/* Select Event */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase' }}>Event</label>
          <select
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => e.target.style.borderColor = '#ff3131'}
            onBlur={e => e.target.style.borderColor = '#333'}
          >
            <option value="">Select an event...</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.videos?.title?.substring(0, 40)} — {event.target_views?.toLocaleString()} views
              </option>
            ))}
          </select>
        </div>

        {/* Entries */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontWeight: '700', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trade Entries</label>
            <button
              onClick={addEntry}
              style={{ padding: '0.375rem 0.75rem', backgroundColor: '#1a1a1a', color: '#ff3131', border: '2px solid #ff3131', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              + Add Entry
            </button>
          </div>

          {/* Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 32px', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {['Side', 'Buy Price', 'Quantity', 'Sell Price', ''].map((h, i) => (
              <span key={i} style={{ color: '#555', fontSize: '0.75rem', fontWeight: '600' }}>{h}</span>
            ))}
          </div>

          {entries.map((entry, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 32px', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
              {/* Side Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {['YES', 'NO'].map(side => (
                  <button
                    key={side}
                    onClick={() => updateEntry(i, 'side', side)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: entry.side === side ? (side === 'YES' ? '#00c853' : '#ff3131') : '#0a0a0a',
                      color: 'white',
                      border: `2px solid ${side === 'YES' ? '#00c853' : '#ff3131'}`,
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    {side}
                  </button>
                ))}
              </div>

              {/* Buy Price */}
              <select
                value={entry.buy_price}
                onChange={e => updateEntry(i, 'buy_price', e.target.value)}
                style={{ ...inputStyle }}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              >
                <option value="">Select...</option>
                {priceOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Quantity */}
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={entry.quantity}
                onChange={e => updateEntry(i, 'quantity', e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />

              {/* Sell Price */}
              <select
                value={entry.sell_price}
                onChange={e => updateEntry(i, 'sell_price', e.target.value)}
                style={{ ...inputStyle }}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              >
                <option value="">Select...</option>
                {sellPriceOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {entries.length > 1 ? (
                <button onClick={() => removeEntry(i)} style={{ backgroundColor: 'transparent', border: '1px solid #ff3131', color: '#ff3131', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              ) : <div />}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', color: '#b7c6c2', fontSize: '0.85rem', textTransform: 'uppercase' }}>Notes</label>
          <textarea
            placeholder="Any notes about this trade..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = '#ff3131'}
            onBlur={e => e.target.style.borderColor = '#333'}
          />
        </div>

        {/* Profit Breakdown */}
        <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>Gross Profit</span>
            <span style={{ color: grossProfit >= 0 ? '#00c853' : '#ff3131', fontWeight: '700' }}>₹{grossProfit.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>Commission (15%)</span>
            <span style={{ color: '#ff3131', fontWeight: '700' }}>-₹{commission.toFixed(2)}</span>
          </div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontWeight: '700' }}>Net Profit</span>
            <span style={{ color: netProfit >= 0 ? '#00c853' : '#ff3131', fontWeight: '800', fontSize: '1.1rem' }}>
              {netProfit >= 0 ? '+' : ''}₹{netProfit.toFixed(2)}
            </span>
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
            style={{ padding: '0.875rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
          >
            {loading ? 'Saving...' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}