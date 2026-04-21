'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [mode, setMode] = useState<'owner' | 'employee'>('owner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [empUsername, setEmpUsername] = useState('')
  const [empPassword, setEmpPassword] = useState('')

  useEffect(() => {
    if (mode === 'employee') loadCompanies()
  }, [mode])

  async function loadCompanies() {
    const { data, error } = await supabase.rpc('get_companies_list')
    if (error) { console.error(error); return }
    setCompanies(data || [])
    if (data && data.length > 0 && !selectedCompany) setSelectedCompany(data[0].id)
  }

  async function loginOwner(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: ownerEmail.trim(),
        password: ownerPassword,
      })
      if (authErr) throw authErr
      if (!authData.user) throw new Error('Utilisateur introuvable')

      const { data: ownerData, error: ownerErr } = await supabase.rpc('get_owner_info', {
        p_user_id: authData.user.id
      })

      if (ownerErr) throw ownerErr
      if (!ownerData) throw new Error('Aucune entreprise liée à ce compte')

      const { data: subData } = await supabase.rpc('get_company_subscription', {
        p_company_id: ownerData.company_id
      })

      if (!ownerData.is_platform_admin && (subData?.status === 'cancelled' || subData?.status === 'expired')) {
        await supabase.auth.signOut()
        throw new Error('Votre abonnement est suspendu. Contactez RS Comptabilité.')
      }

      localStorage.setItem('user', JSON.stringify({
        id: authData.user.id,
        email: authData.user.email,
        full_name: ownerData.full_name,
        role: 'owner',
        company_id: ownerData.company_id,
        company_name: ownerData.company_name,
        is_platform_admin: ownerData.is_platform_admin,
        type: 'owner',
      }))
      if (subData) localStorage.setItem('subscription', JSON.stringify(subData))

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : (err.message || 'Erreur de connexion'))
    }
    setLoading(false)
  }

  async function loginEmployee(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!selectedCompany) throw new Error('Sélectionnez une entreprise')

      const { data, error: fnErr } = await supabase.rpc('login_employee', {
        p_username: empUsername.trim(),
        p_password: empPassword,
        p_company_id: selectedCompany,
      })

      if (fnErr) throw fnErr
      if (!data) throw new Error('Nom d\'utilisateur ou mot de passe incorrect')

      localStorage.setItem('user', JSON.stringify({ ...data, type: 'employee' }))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f8f7f5 0%, #e8e6e0 100%)', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #2563EB, #5B3DF5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, boxShadow: '0 10px 30px rgba(91,61,245,0.35)', marginBottom: 16, letterSpacing: '-1px' }}>RSS</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#1a1916', letterSpacing: '-.5px' }}>RSS</div>
          <div style={{ fontSize: 13, color: '#6b6860', marginTop: 4 }}>Système de gestion comptable</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>

          <div style={{ background: '#f0eeea', borderRadius: 10, padding: 4, display: 'flex', marginBottom: 24 }}>
            <button onClick={() => { setMode('owner'); setError('') }}
              style={{ flex: 1, padding: '10px', borderRadius: 7, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: mode === 'owner' ? 600 : 500, background: mode === 'owner' ? '#fff' : 'transparent', color: mode === 'owner' ? '#1a1916' : '#6b6860', boxShadow: mode === 'owner' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
              🏢 Propriétaire
            </button>
            <button onClick={() => { setMode('employee'); setError('') }}
              style={{ flex: 1, padding: '10px', borderRadius: 7, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: mode === 'employee' ? 600 : 500, background: mode === 'employee' ? '#fff' : 'transparent', color: mode === 'employee' ? '#1a1916' : '#6b6860', boxShadow: mode === 'employee' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
              👤 Employé
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1916', marginBottom: 4 }}>{mode === 'owner' ? 'Connexion entreprise' : 'Connexion employé'}</div>
            <div style={{ fontSize: 12, color: '#a8a69e' }}>{mode === 'owner' ? 'Connectez-vous avec votre email professionnel' : 'Utilisez les identifiants fournis par votre administrateur'}</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {mode === 'owner' && (
            <form onSubmit={loginOwner}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Email professionnel</label>
                <input type="email" required autoFocus value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="contact@votre-entreprise.com"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Mot de passe</label>
                <input type="password" required value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} placeholder="••••••••"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, background: loading ? '#a8a69e' : 'linear-gradient(135deg, #2563EB, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#6b6860' }}>
                Pas encore de compte ?{' '}
                <Link href="/signup" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Créer une entreprise</Link>
              </div>
            </form>
          )}

          {mode === 'employee' && (
            <form onSubmit={loginEmployee}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Entreprise</label>
                {companies.length === 0 ? (
                  <div style={{ padding: '11px 14px', background: '#fff7ed', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 8, fontSize: 12, color: '#b45309' }}>
                    Aucune entreprise disponible
                  </div>
                ) : (
                  <select required value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Nom d'utilisateur</label>
                <input type="text" required autoFocus value={empUsername} onChange={e => setEmpUsername(e.target.value)} placeholder="prenom.nom"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Mot de passe</label>
                <input type="password" required value={empPassword} onChange={e => setEmpPassword(e.target.value)} placeholder="••••••••"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <button type="submit" disabled={loading || !selectedCompany}
                style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, background: (loading || !selectedCompany) ? '#a8a69e' : 'linear-gradient(135deg, #2563EB, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, cursor: (loading || !selectedCompany) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#a8a69e' }}>
          <strong style={{ color: '#6b6860' }}>RSS</strong> · Développé par <strong style={{ color: '#6b6860' }}>RS Comptabilité</strong><br/>
          <span style={{ fontSize: 10 }}>Tous droits réservés © 2026</span>
        </div>
      </div>
    </div>
  )
}