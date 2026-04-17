'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!username || !password) { setError('Veuillez remplir tous les champs'); return }
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()
    if (err || !data) {
      setError('Identifiant ou mot de passe incorrect')
      setLoading(false)
      return
    }
    localStorage.setItem('user', JSON.stringify(data))
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', width: '100%', maxWidth: 400, padding: '36px 32px' }}>

        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.3px', color: '#1a1916' }}>ABOU IYAD</div>
            <div style={{ fontSize: 11, color: '#a8a69e' }}>RS Comptabilité</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1916', marginBottom: 4 }}>Connexion</div>
          <div style={{ fontSize: 13, color: '#a8a69e' }}>Système de gestion — Algérie (DZD)</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* USERNAME */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 5 }}>Nom d'utilisateur</label>
          <input
            style={{ width: '100%', background: '#f0eeea', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 5, padding: '9px 12px', fontSize: 13, color: '#1a1916', fontFamily: 'Outfit, sans-serif', outline: 'none' }}
            placeholder="Ex: admin"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.14)'}
          />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 5 }}>Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              style={{ width: '100%', background: '#f0eeea', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 5, padding: '9px 40px 9px 12px', fontSize: 13, color: '#1a1916', fontFamily: 'Outfit, sans-serif', outline: 'none' }}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a8a69e', padding: 4 }}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* SUBMIT */}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', background: loading ? '#93b4f5' : '#2563EB', color: '#fff', border: 'none', borderRadius: 6, padding: '11px', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {loading && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />}
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        {/* DEMO */}
        <div style={{ background: '#f0eeea', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#a8a69e', marginBottom: 8 }}>Compte de démonstration</div>
          <button onClick={() => { setUsername('admin'); setPassword('admin123') }}
            style={{ fontSize: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', color: '#6b6860', fontFamily: 'Outfit, sans-serif' }}>
            admin / admin123
          </button>
        </div>

        {/* DEV CREDIT */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#c8c6be' }}>
          Développé par <span style={{ color: '#2563EB', fontWeight: 500 }}>RS Comptabilité</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}