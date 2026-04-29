'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    company_name: '', full_name: '', email: '', phone: '', password: '', confirm: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (!form.company_name.trim()) { setError('Le nom de l\'entreprise est requis'); return }
    if (!form.full_name.trim()) { setError('Votre nom complet est requis'); return }
    if (!form.email.trim()) { setError('L\'email est requis'); return }
    if (!form.password || form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    try {
      // Step 1: Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      })
      if (authErr) {
        // Handle specific auth errors
        if (authErr.message.includes('already registered')) {
          setError('Cet email est déjà utilisé. Veuillez vous connecter.')
        } else if (authErr.message.includes('Invalid email')) {
          setError('Adresse email invalide')
        } else {
          throw authErr
        }
        setLoading(false)
        return
      }
      if (!authData.user) throw new Error('Impossible de créer le compte utilisateur')

      // Step 2: Create company and link to user
      // Try the main RPC function first
      let rpcResult = await supabase.rpc('create_company_with_owner', {
        p_company_name: form.company_name.trim(),
        p_owner_email: form.email.trim().toLowerCase(),
        p_owner_id: authData.user.id,
        p_owner_full_name: form.full_name.trim(),
        p_owner_phone: form.phone?.trim() || null,
      })

      // If RPC fails, try alternative function
      if (rpcResult.error) {
        console.log('Primary RPC failed, trying alternative:', rpcResult.error.message)
        
        rpcResult = await supabase.rpc('add_company_to_owner', {
          p_user_id: authData.user.id,
          p_company_name: form.company_name.trim(),
          p_slug: form.company_name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'),
          p_currency: 'DZD'
        })
      }

      // If still fails, create company manually
      if (rpcResult.error) {
        console.log('RPC failed, creating manually:', rpcResult.error.message)
        
        // Create company
        const { data: companyData, error: companyErr } = await supabase
          .from('companies')
          .insert({
            name: form.company_name.trim(),
            slug: form.company_name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'),
            owner_id: authData.user.id,
            sub_status: 'trial',
            sub_trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()
        
        if (companyErr) throw companyErr
        
        // Create user record
        const { error: userErr } = await supabase
          .from('users')
          .update({
            company_id: companyData.id,
            full_name: form.full_name.trim(),
            phone: form.phone?.trim() || null,
            role: 'admin',
          })
          .eq('id', authData.user.id)
        
        if (userErr) console.log('User update warning:', userErr.message)
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    } catch (err: any) {
      console.error('Signup error:', err)
      if (err.message?.includes('already registered')) {
        setError('Cet email est déjà utilisé')
      } else if (err.message?.includes('duplicate')) {
        setError('Cette entreprise ou cet email existe déjà')
      } else {
        setError(err.message || 'Erreur lors de la création du compte')
      }
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f8f7f5 0%, #e8e6e0 100%)', fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 440, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Compte créé avec succès !</div>
          <div style={{ fontSize: 13, color: '#6b6860', marginBottom: 20, lineHeight: 1.5 }}>
            Votre période d'essai de <strong>14 jours</strong> a commencé.<br/>
            Confirmation envoyée à <strong>{form.email}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#a8a69e' }}>Redirection en cours...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f8f7f5 0%, #e8e6e0 100%)', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #2563EB, #5B3DF5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800, boxShadow: '0 8px 24px rgba(91,61,245,0.3)', marginBottom: 14 }}>A</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1916', letterSpacing: '-.5px' }}>Créer votre entreprise</div>
          <div style={{ fontSize: 13, color: '#6b6860', marginTop: 6 }}>14 jours d'essai gratuit · Aucune carte bancaire requise</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>{error}</div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Nom de l'entreprise *</label>
              <input required autoFocus value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Ma Société SARL"
                style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Votre nom *</label>
                <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prénom Nom"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0550 00 00 00"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Email professionnel *</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@votre-entreprise.com"
                style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Mot de passe *</label>
                <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caractères"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Confirmer *</label>
                <input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="Retapez"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, background: '#f8f7f5', color: '#1a1916', fontFamily: 'inherit', outline: 'none' }}/>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(91,61,245,0.05)', border: '1px solid rgba(91,61,245,0.15)', borderRadius: 8, fontSize: 11, color: '#5B3DF5', marginBottom: 16 }}>
              <strong>✨ Période d'essai 14 jours :</strong> Accès complet à toutes les fonctionnalités.
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, background: loading ? '#a8a69e' : 'linear-gradient(135deg, #2563EB, #5B3DF5)', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Création en cours...' : 'Créer mon entreprise'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#6b6860' }}>
              Déjà un compte ?{' '}
              <Link href="/" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}