import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import axios from 'axios';

export default function NOA() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSavedQuestions();
    setMessages([{ role: 'assistant', content: "Hi! I'm NOA, your trading assistant. Ask me anything about your performance, current events, or trading strategy!" }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSavedQuestions = async () => {
    const { data } = await supabase
      .from('noa_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSavedQuestions(data);
  };

  const saveQuestion = async (question) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('noa_questions').insert({ user_id: user.id, question_text: question });
    fetchSavedQuestions();
  };

  const deleteQuestion = async (id) => {
    await supabase.from('noa_questions').delete().eq('id', id);
    fetchSavedQuestions();
  };

  const getContext = async () => {
    const { data: trades } = await supabase
      .from('trades')
      .select(`*, events (*, videos (*))`)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: events } = await supabase
      .from('events')
      .select(`*, videos (*)`)
      .order('created_at', { ascending: false })
      .limit(5);

    return { trades, transactions, events };
  };

  const sendMessage = async (question) => {
    const text = question || input;
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const context = await getContext();
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.post(`${backendUrl}/api/noa/chat`, {
        message: text,
        context
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#ff3131', borderBottom: '2px solid black', padding: '0 2rem', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontWeight: '800', fontSize: '1.5rem', color: 'white' }}>ViewStats — NOA</h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#0a0a0a', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
        >
          ← Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 70px)' }}>
        {/* Left — Saved Questions */}
        <div style={{ backgroundColor: '#1a1a1a', borderRight: '2px solid black', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '2px solid black' }}>
            <h3 style={{ color: '#ff3131', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase' }}>Saved Questions</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {savedQuestions.length === 0 ? (
              <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>No saved questions yet</p>
            ) : savedQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => sendMessage(q.question_text)}
                  style={{ flex: 1, padding: '0.5rem', backgroundColor: '#0a0a0a', color: '#b7c6c2', border: '1px solid #333', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', fontWeight: '500' }}
                >
                  {q.question_text}
                </button>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: '#ff3131', border: '1px solid #ff3131', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Chat */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '1rem',
                  backgroundColor: msg.role === 'user' ? '#ff3131' : '#1a1a1a',
                  border: '2px solid black',
                  boxShadow: '4px 4px 0px 0px #000',
                  color: 'white',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  {msg.role === 'assistant' && (
                    <p style={{ color: '#ff3131', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>NOA</p>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '1rem', backgroundColor: '#1a1a1a', border: '2px solid black', color: '#b7c6c2', fontSize: '0.9rem' }}>
                  NOA is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: '2px solid black', backgroundColor: '#1a1a1a', display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask NOA anything..."
              style={{ flex: 1, padding: '0.875rem', border: '2px solid #333', backgroundColor: '#0a0a0a', color: 'white', fontSize: '0.95rem', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#ff3131'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
            <button
              onClick={() => saveQuestion(input)}
              disabled={!input.trim()}
              style={{ padding: '0.875rem 1rem', backgroundColor: '#1a1a1a', color: '#b7c6c2', border: '2px solid #333', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
              title="Save this question"
            >
              💾
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ padding: '0.875rem 1.5rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000'; }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}