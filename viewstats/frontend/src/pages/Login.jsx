import { useState } from 'react';
import supabase from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #333',
    backgroundColor: '#1a1a1a',
    color: 'white',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '1rem'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* Top Banner */}
      <div style={{ backgroundColor: '#ff3131', borderBottom: '2px solid black', padding: '1.5rem 2rem' }}>
        <div style={{ backgroundColor: '#0a0a0a', border: '2px solid black', display: 'inline-block', padding: '0.375rem 0.75rem', marginBottom: '1rem', boxShadow: '3px 3px 0px 0px #000' }}>
          <span style={{ color: '#ff3131', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prediction Market Tool</span>
        </div>
        <h1 style={{ color: 'white', fontWeight: '800', fontSize: '2.5rem', lineHeight: '1.1', marginBottom: '0.75rem' }}>ViewStats</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Real-time YouTube view tracking for smarter prediction market trading.
        </p>

        {/* Features — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['📊 Live Tracking', '🎯 8 Metrics', '💰 Performance', '🤖 NOA AI'].map((f, i) => (
            <div key={i} style={{ backgroundColor: '#0a0a0a', border: '2px solid black', padding: '0.375rem 0.75rem', whiteSpace: 'nowrap', boxShadow: '2px 2px 0px 0px #000', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '600' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', fontWeight: '800', fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: '#b7c6c2', fontSize: '0.9rem' }}>
            {isSignUp ? 'Sign up to start tracking' : 'Sign in to your account'}
          </p>
        </div>

        <label style={{ color: '#b7c6c2', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#ff3131'}
          onBlur={e => e.target.style.borderColor = '#333'}
        />

        <label style={{ color: '#b7c6c2', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#ff3131'}
          onBlur={e => e.target.style.borderColor = '#333'}
        />

        {error && (
          <div style={{ backgroundColor: '#1a0000', border: '2px solid #ff3131', padding: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ color: '#ff3131', fontSize: '0.875rem', fontWeight: '600' }}>⚠ {error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '1rem', backgroundColor: '#ff3131', color: 'white', border: '2px solid black', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', boxShadow: '4px 4px 0px 0px #000000', transition: 'all 0.2s', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000'; }}
        >
          {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', textAlign: 'center' }}>
          <span style={{ color: '#555', fontSize: '0.85rem' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <span
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            style={{ color: '#ff3131', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
}