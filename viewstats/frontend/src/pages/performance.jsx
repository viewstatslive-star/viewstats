import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import AddTradeModal from '../components/AddTradeModal';

export default function Performance() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('trades');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
    fetchTransactions();
    fetchNotes();
  }, []);

  const fetchTrades = async () => {
    const { data } = await supabase
      .from('trades')
      .select(`*, events (*, videos (*))`)
      .order('created_at', { ascending: false });
    if (data) setTrades(data);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (data) setTransactions(data);
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('noa_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('noa_questions').insert({ user_id: user.id, question_text: newNote });
    setNewNote('');
    fetchNotes();
  };

  const deleteNote = async (id) => {
    await supabase.from('noa_questions').delete().eq('id', id);
    fetchNotes();
  };

  // Basic metrics
  const totalProfit = trades.reduce((sum, t) => sum + (t.final_profit || 0), 0);
  const totalGrossProfit = trades.reduce((sum, t) => sum + (t.final_profit || 0) + (t.commission || 0), 0);
  const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
  const winningTrades = trades.filter(t => t.final_profit > 0).length;
  const losingTrades = trades.filter(t => t.final_profit < 0).length;
  const winRate = trades.length > 0 ? Math.round((winningTrades / trades.length) * 100) : 0;
  const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
  const biggestWin = trades.length > 0 ? Math.max(...trades.map(t => t.final_profit || 0)) : 0;
  const biggestLoss = trades.length > 0 ? Math.min(...trades.map(t => t.final_profit || 0)) : 0;
  const avgRR = trades.length > 0 ? trades.reduce((sum, t) => sum + (t.risk_reward || 0), 0) / trades.length : 0;
  const profitFactor = losingTrades > 0
    ? trades.filter(t => t.final_profit > 0).reduce((sum, t) => sum + t.final_profit, 0) /
      Math.abs(trades.filter(t => t.final_profit < 0).reduce((sum, t) => sum + t.final_profit, 0))
    : 0;

  // Side analysis
  const allEntries = trades.flatMap(t => (t.entries || []).map(e => ({ ...e, profit: t.final_profit })));
  
  const yesEntries = trades.filter(t => t.entries?.some(e => e.side === 'YES'));
  const noEntries = trades.filter(t => t.entries?.some(e => e.side === 'NO'));
  const yesWinRate = yesEntries.length > 0
    ? Math.round((yesEntries.filter(t => t.final_profit > 0).length / yesEntries.length) * 100)
    : 0;
  const noWinRate = noEntries.length > 0
    ? Math.round((noEntries.filter(t => t.final_profit > 0).length / noEntries.length) * 100)
    : 0;

  // Risk analysis
  const avgBuyPrice = allEntries.length > 0
    ? allEntries.reduce((sum, e) => sum + (parseFloat(e.buy_price) || 0), 0) / allEntries.length
    : 0;
  const avgSellPrice = allEntries.length > 0
    ? allEntries.reduce((sum, e) => sum + (parseFloat(e.sell_price) || 0), 0) / allEntries.length
    : 0;
  const avgPriceMovement = allEntries.length > 0
    ? allEntries.reduce((sum, e) => sum + Math.abs((parseFloat(e.sell_price) || 0) - (parseFloat(e.buy_price) || 0)), 0) / allEntries.length
    : 0;

  // Monthly performance
  const monthlyPerformance = () => {
    const months = {};
    trades.forEach(t => {
      const date = new Date(t.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { profit: 0, trades: 0, wins: 0 };
      months[key].profit += t.final_profit || 0;
      months[key].trades += 1;
      if (t.final_profit > 0) months[key].wins += 1;
    });
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const metrics = [
    // Row 1 - Core
    { label: 'Net Profit', value: `₹${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? '#00c853' : '#ff3131', desc: 'Total profit after 15% commission' },
    { label: 'Gross Profit', value: `₹${totalGrossProfit.toFixed(2)}`, color: totalGrossProfit >= 0 ? '#00c853' : '#ff3131', desc: 'Total profit before commission deduction' },
    { label: 'Commission Paid', value: `₹${totalCommission.toFixed(2)}`, color: '#ff3131', desc: 'Total 15% commission paid on winning trades' },
    { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? '#00c853' : '#ff3131', desc: '% of trades that were profitable' },
    { label: 'Total Trades', value: trades.length, color: 'white', desc: 'Total number of trades logged' },
    { label: 'Winning Trades', value: winningTrades, color: '#00c853', desc: 'Number of trades with positive profit' },
    { label: 'Losing Trades', value: losingTrades, color: '#ff3131', desc: 'Number of trades with negative profit' },
    { label: 'Avg Net Profit', value: `₹${avgProfit.toFixed(2)}`, color: avgProfit >= 0 ? '#00c853' : '#ff3131', desc: 'Average profit per trade after commission' },
    { label: 'Biggest Win', value: `₹${biggestWin.toFixed(2)}`, color: '#00c853', desc: 'Your most profitable single trade' },
    { label: 'Biggest Loss', value: `₹${biggestLoss.toFixed(2)}`, color: '#ff3131', desc: 'Your worst single trade loss' },
    { label: 'Avg R:R', value: avgRR.toFixed(2), color: '#b7c6c2', desc: 'Average ratio of profit to amount invested' },
    { label: 'Profit Factor', value: profitFactor.toFixed(2), color: profitFactor >= 1 ? '#00c853' : '#ff3131', desc: 'Total wins divided by total losses. >1 means profitable overall' },
    // Side analysis
    { label: 'YES Win Rate', value: `${yesWinRate}%`, color: yesWinRate >= 50 ? '#00c853' : '#ff3131', desc: '% of trades where you bought YES side and profited' },
    { label: 'NO Win Rate', value: `${noWinRate}%`, color: noWinRate >= 50 ? '#00c853' : '#ff3131', desc: '% of trades where you bought NO side and profited' },
    // Risk analysis
    { label: 'Avg Buy Price', value: avgBuyPrice.toFixed(2), color: '#b7c6c2', desc: 'Your average entry price across all trades' },
    { label: 'Avg Sell Price', value: avgSellPrice.toFixed(2), color: '#b7c6c2', desc: 'Your average exit price across all trades' },
    { label: 'Avg Price Move', value: avgPriceMovement.toFixed(2), color: '#b7c6c2', desc: 'Average price movement you capture per trade entry' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#ff3131', borderBottom: '2px solid black', padding: '0 2rem', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>ViewStats</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}>
            Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#ff3131', fontWeight: '800', fontSize: '1.75rem' }}>Performance</h2>
          <button onClick={() => setShowTradeModal(true)}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}>
            + Add Trade
          </button>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {metrics.map((stat, i) => (
            <div key={i} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', boxShadow: '4px 4px 0px 0px #ff3131', padding: '1rem', position: 'relative', group: true }}
              title={stat.desc}>
              <p style={{ color: '#b7c6c2', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{stat.label}</p>
              <p style={{ color: stat.color, fontWeight: '800', fontSize: '1.1rem' }}>{stat.value}</p>
              <p style={{ color: '#333', fontSize: '0.65rem', marginTop: '0.35rem', lineHeight: '1.3' }}>{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['trades', 'calendar', 'monthly', 'money', 'notes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '0.5rem 1.25rem', backgroundColor: activeTab === tab ? '#ff3131' : '#1a1a1a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: activeTab === tab ? 'none' : '4px 4px 0px 0px #ff3131', fontSize: '0.85rem' }}>
              {tab === 'trades' ? 'Journal' : tab === 'calendar' ? 'Calendar' : tab === 'monthly' ? 'Monthly' : tab === 'money' ? 'Money' : 'Notes'}
            </button>
          ))}
        </div>

        {/* Trade Journal */}
        {activeTab === 'trades' && (
          <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr 1.5fr', backgroundColor: '#ff3131', padding: '0.75rem 1rem', borderBottom: '2px solid black' }}>
              {['Event', 'Side', 'Entries', 'Gross', 'Commission', 'Net Profit', 'Notes'].map((h, i) => (
                <span key={i} style={{ color: 'white', fontWeight: '700', fontSize: '0.8rem' }}>{h}</span>
              ))}
            </div>
            {loading ? (
              <p style={{ color: '#ff3131', padding: '1rem' }}>Loading...</p>
            ) : trades.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: '#b7c6c2', fontWeight: '700' }}>No trades yet</p>
                <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.5rem' }}>Click "+ Add Trade" to log your first trade</p>
              </div>
            ) : trades.map((trade, i) => {
              const gross = (trade.final_profit || 0) + (trade.commission || 0);
              const sides = [...new Set((trade.entries || []).map(e => e.side))].join('/');
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.75rem 1rem', borderBottom: '1px solid #333', backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#111' }}>
                  <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '600' }}>
                    {trade.events?.videos?.title?.substring(0, 30)}...
                    <br />
                    <span style={{ color: '#555', fontSize: '0.7rem' }}>{new Date(trade.created_at).toLocaleDateString()}</span>
                  </span>
                  <span style={{ color: sides.includes('YES') ? '#00c853' : '#ff3131', fontSize: '0.8rem', fontWeight: '700' }}>{sides}</span>
                  <span style={{ color: '#b7c6c2', fontSize: '0.8rem' }}>{trade.entries?.length || 0}</span>
                  <span style={{ color: gross >= 0 ? '#00c853' : '#ff3131', fontSize: '0.8rem', fontWeight: '600' }}>
                    {gross >= 0 ? '+' : ''}₹{gross.toFixed(2)}
                  </span>
                  <span style={{ color: '#ff3131', fontSize: '0.8rem' }}>-₹{(trade.commission || 0).toFixed(2)}</span>
                  <span style={{ color: trade.final_profit >= 0 ? '#00c853' : '#ff3131', fontWeight: '700', fontSize: '0.8rem' }}>
                    {trade.final_profit >= 0 ? '+' : ''}₹{trade.final_profit?.toFixed(2)}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.75rem' }}>{trade.notes || '—'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && <CalendarView trades={trades} />}

        {/* Monthly */}
        {activeTab === 'monthly' && (
          <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', backgroundColor: '#ff3131', padding: '0.75rem 1rem', borderBottom: '2px solid black' }}>
              {['Month', 'Trades', 'Win Rate', 'Gross', 'Net Profit'].map((h, i) => (
                <span key={i} style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>{h}</span>
              ))}
            </div>
            {monthlyPerformance().length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#b7c6c2' }}>No monthly data yet</p>
              </div>
            ) : monthlyPerformance().map(([month, data], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid #333', backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#111' }}>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem' }}>{month}</span>
                <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>{data.trades}</span>
                <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>{Math.round((data.wins / data.trades) * 100)}%</span>
                <span style={{ color: data.profit >= 0 ? '#00c853' : '#ff3131', fontSize: '0.85rem' }}>
                  {data.profit >= 0 ? '+' : ''}₹{(data.profit / 0.85).toFixed(2)}
                </span>
                <span style={{ color: data.profit >= 0 ? '#00c853' : '#ff3131', fontWeight: '700', fontSize: '0.85rem' }}>
                  {data.profit >= 0 ? '+' : ''}₹{data.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Money */}
        {activeTab === 'money' && (
          <MoneyTab transactions={transactions} onRefresh={fetchTransactions} />
        )}

        {/* Notes */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ color: 'white', fontWeight: '800', marginBottom: '1rem' }}>Add Note</h3>
              <textarea
                placeholder="Write a note, reminder, or trading rule..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.875rem', border: '2px solid #333', backgroundColor: '#0a0a0a', color: 'white', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: '1rem' }}
                onFocus={e => e.target.style.borderColor = '#ff3131'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />
              <button onClick={addNote} disabled={!newNote.trim()}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000'; }}>
                Save Note
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notes.length === 0 ? (
                <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: '#b7c6c2' }}>No notes yet</p>
                </div>
              ) : notes.map((note, i) => (
                <div key={i} style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: 'white', fontSize: '0.95rem', lineHeight: '1.5' }}>{note.question_text}</p>
                    <p style={{ color: '#333', fontSize: '0.75rem', marginTop: '0.5rem' }}>{new Date(note.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteNote(note.id)}
                    style={{ backgroundColor: 'transparent', border: '1px solid #ff3131', color: '#ff3131', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginLeft: '1rem', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showTradeModal && (
        <AddTradeModal onClose={() => setShowTradeModal(false)} onTradeAdded={fetchTrades} />
      )}
    </div>
  );
}

function CalendarView({ trades }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (month, year) => new Date(year, month, 1).getDay();

  const getDayProfit = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return trades.filter(t => t.created_at?.startsWith(dateStr)).reduce((sum, t) => sum + (t.final_profit || 0), 0);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDay(currentMonth, currentYear);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer' }}>←</button>
        <h3 style={{ color: 'white', fontWeight: '800' }}>{monthNames[currentMonth]} {currentYear}</h3>
        <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer' }}>→</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', color: '#b7c6c2', fontSize: '0.75rem', fontWeight: '700', padding: '0.5rem' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day = i + 1;
          const profit = getDayProfit(day);
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasTrades = trades.some(t => t.created_at?.startsWith(dateStr));
          return (
            <div key={day} style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #333', backgroundColor: !hasTrades ? '#111' : profit >= 0 ? '#003d1a' : '#3d0000', borderLeft: hasTrades ? `3px solid ${profit >= 0 ? '#00c853' : '#ff3131'}` : '1px solid #333' }}>
              <p style={{ color: '#b7c6c2', fontSize: '0.75rem' }}>{day}</p>
              {hasTrades && <p style={{ color: profit >= 0 ? '#00c853' : '#ff3131', fontSize: '0.7rem', fontWeight: '700' }}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(0)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoneyTab({ transactions, onRefresh }) {
  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!amount) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('transactions').insert({ user_id: user.id, type, amount: parseFloat(amount), notes });
    setAmount('');
    setNotes('');
    onRefresh();
    setLoading(false);
  };

  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const backupCapital = transactions.filter(t => t.type === 'backup_capital').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1.5rem' }}>
        <h3 style={{ color: 'white', fontWeight: '800', marginBottom: '1.5rem' }}>Add Transaction</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['deposit', 'withdrawal', 'backup_capital'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ flex: 1, padding: '0.5rem', backgroundColor: type === t ? '#ff3131' : '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', fontSize: '0.7rem' }}>
              {t === 'backup_capital' ? 'Backup' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '2px solid #333', backgroundColor: '#0a0a0a', color: 'white', marginBottom: '0.75rem', boxSizing: 'border-box', fontSize: '0.95rem' }} />
        <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '2px solid #333', backgroundColor: '#0a0a0a', color: 'white', marginBottom: '1rem', boxSizing: 'border-box', fontSize: '0.95rem' }} />
        <button onClick={handleAdd} disabled={loading}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000'; }}>
          {loading ? 'Adding...' : 'Add'}
        </button>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { label: 'Total Deposits', value: totalDeposits, color: '#00c853' },
            { label: 'Total Withdrawals', value: totalWithdrawals, color: '#ff3131' },
            { label: 'Backup Capital', value: backupCapital, color: '#b7c6c2' },
            { label: 'Net Balance', value: totalDeposits - totalWithdrawals, color: (totalDeposits - totalWithdrawals) >= 0 ? '#00c853' : '#ff3131' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#0a0a0a', border: '1px solid #333' }}>
              <span style={{ color: '#b7c6c2', fontSize: '0.85rem' }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: '700', fontSize: '0.85rem' }}>₹{item.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: '#1a1a1a', border: '2px solid black', padding: '1.5rem' }}>
        <h3 style={{ color: 'white', fontWeight: '800', marginBottom: '1rem' }}>Transaction History</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {transactions.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem' }}>No transactions yet</p>
          ) : transactions.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#0a0a0a', border: '1px solid #333' }}>
              <div>
                <p style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</p>
                {t.notes && <p style={{ color: '#555', fontSize: '0.75rem' }}>{t.notes}</p>}
                <p style={{ color: '#333', fontSize: '0.7rem' }}>{new Date(t.date).toLocaleDateString()}</p>
              </div>
              <span style={{ color: t.type === 'withdrawal' ? '#ff3131' : '#00c853', fontWeight: '700' }}>
                {t.type === 'withdrawal' ? '-' : '+'}₹{t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}