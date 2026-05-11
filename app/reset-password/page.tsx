'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontSize: 14,
  border: '1px solid rgba(0,0,0,0.14)',
  borderRadius: 8,
  background: '#f8f7f5',
  color: '#1a1916',
  fontFamily: 'inherit',
  outline: 'none',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ password: '', confirm: '' })

  useEffect(() => {
    let active = true

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSlug(params.get('slug') || '')
    }

    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setReady(Boolean(data.session))
      setChecking(false)
    }

    const timer = window.setTimeout(() => {
      void checkSession()
    }, 700)

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(Boolean(session))
        setChecking(false)
      }
    })

    return () => {
      active = false
      window.clearTimeout(timer)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.password || form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.')
      return
    }

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      })

      if (updateError) throw updateError

      setMessage('Mot de passe mis a jour. Redirection vers la connexion...')
      window.setTimeout(async () => {
        await supabase.auth.signOut()
        router.replace(slug ? `/${slug}` : '/')
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre a jour le mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'linear-gradient(135deg,#f8f7f5,#e8e6e0)', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#2563EB,#1d4ed8)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:22, fontWeight:800, marginBottom:14 }}>RSS</div>
          <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-.5px', color:'#1a1916' }}>Nouveau mot de passe</div>
          <div style={{ fontSize:13, color:'#6b6860', marginTop:6 }}>Reinitialisation reservee au compte proprietaire.</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, padding:28, boxShadow:'0 10px 40px rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)' }}>
          {checking ? (
            <div style={{ color:'#a8a69e', textAlign:'center', fontSize:13 }}>Verification du lien...</div>
          ) : !ready ? (
            <div>
              <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#dc2626', marginBottom:16 }}>
                Ce lien est invalide ou a expire.
              </div>
              <Link href={slug ? `/${slug}` : '/'} style={{ color:'#2563EB', fontWeight:600, textDecoration:'none', fontSize:13 }}>
                Retour a la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {message && <div style={{ background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#15803d', marginBottom:16 }}>{message}</div>}
              {error && <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:16 }}>{error}</div>}

              <label style={{ fontSize:12, color:'#6b6860', marginBottom:6, display:'block' }}>Nouveau mot de passe</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                placeholder="Minimum 6 caracteres"
                style={{ ...inputStyle, marginBottom:14 }}
              />

              <label style={{ fontSize:12, color:'#6b6860', marginBottom:6, display:'block' }}>Confirmer</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm((current) => ({ ...current, confirm: e.target.value }))}
                placeholder="Retapez votre mot de passe"
                style={{ ...inputStyle, marginBottom:18 }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{ width:'100%', padding:14, fontSize:14, fontWeight:600, background:loading ? '#a8a69e' : 'linear-gradient(135deg,#2563EB,#1d4ed8)', color:'#fff', border:'none', borderRadius:8, cursor:loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}
              >
                {loading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
