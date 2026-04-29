'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isAlreadyRegisteredError(message = '') {
  return message.includes('already registered') || message.includes('already been registered')
}

function isDuplicateError(message = '') {
  return message.includes('duplicate') || message.includes('already exists') || message.includes('existe')
}

function friendlySignupError(message = '') {
  if (isAlreadyRegisteredError(message)) {
    return 'Cet email est déjà utilisé. Veuillez vous connecter.'
  }
  if (message.includes('Invalid email')) return 'Adresse email invalide.'
  if (isDuplicateError(message)) {
    return 'Cette entreprise, ce lien ou cet email existe déjà.'
  }
  if (message.includes('violates row-level security')) {
    return 'La création est bloquée par les règles de sécurité Supabase. Vérifiez la fonction create_company_with_owner.'
  }
  return message || 'Erreur lors de la création du compte.'
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    company_name: '',
    slug: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })

  async function createCompanyForOwner(ownerId: string, email: string, companyName: string, slug: string, fullName: string, phone: string | null) {
    const attempts = [
      () => supabase.rpc('create_company_with_owner', {
        p_company_name: companyName,
        p_slug: slug,
        p_owner_email: email,
        p_owner_id: ownerId,
        p_owner_full_name: fullName,
        p_owner_phone: phone,
        p_currency: 'DZD',
      }),
      () => supabase.rpc('create_company_with_owner', {
        p_company_name: companyName,
        p_slug: slug,
        p_owner_email: email,
        p_owner_id: ownerId,
        p_owner_full_name: fullName,
        p_owner_phone: phone,
      }),
      () => supabase.rpc('create_company_with_owner', {
        p_company_name: companyName,
        p_owner_email: email,
        p_owner_id: ownerId,
        p_owner_full_name: fullName,
        p_owner_phone: phone,
      }),
      () => supabase.rpc('add_company_to_owner', {
        p_user_id: ownerId,
        p_company_name: companyName,
        p_slug: slug,
        p_currency: 'DZD',
      }),
    ]

    let lastError: Error | null = null
    for (const attempt of attempts) {
      const { error } = await attempt()
      if (!error) return

      lastError = error
      console.error('Signup company creation attempt failed:', error)
      if (isDuplicateError(error.message)) break
    }

    throw new Error(lastError ? `Impossible de créer l’entreprise: ${lastError.message}` : 'Impossible de créer l’entreprise.')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const companyName = form.company_name.trim()
    const slug = slugify(form.slug || companyName)
    const fullName = form.full_name.trim()
    const email = form.email.trim().toLowerCase()
    const phone = form.phone.trim() || null

    if (!companyName) { setError('Le nom de l’entreprise est requis.'); return }
    if (!slug) { setError('Le lien de l’entreprise est requis.'); return }
    if (!fullName) { setError('Votre nom complet est requis.'); return }
    if (!email) { setError('L’email est requis.'); return }
    if (!form.password || form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    try {
      let ownerId = ''
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: { company_name: companyName, full_name: fullName, phone, slug },
        },
      })

      if (!authErr && authData.user?.identities?.length === 0) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        })

        if (loginErr || !loginData.user) {
          throw new Error('Cet email existe déjà. Connectez-vous avec le bon mot de passe, ou utilisez un autre email.')
        }

        ownerId = loginData.user.id
      } else if (authErr) {
        if (!isAlreadyRegisteredError(authErr.message)) throw authErr

        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        })

        if (loginErr || !loginData.user) {
          throw new Error('Cet email existe déjà. Connectez-vous avec le bon mot de passe, ou utilisez un autre email.')
        }

        ownerId = loginData.user.id
      } else {
        if (!authData.user) throw new Error('Impossible de créer le compte utilisateur.')
        ownerId = authData.user.id
      }

      await createCompanyForOwner(ownerId, email, companyName, slug, fullName, phone)

      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    } catch (err: unknown) {
      console.error('Signup error:', err)
      await supabase.auth.signOut()
      setError(friendlySignupError(err instanceof Error ? err.message : undefined))
    } finally {
      setLoading(false)
    }
  }

  const updateCompanyName = (companyName: string) => {
    setForm(current => ({
      ...current,
      company_name: companyName,
      slug: current.slug || slugify(companyName),
    }))
  }

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

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #f8f7f5 0%, #e8e6e0 100%)', fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 440, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Compte créé avec succès !</div>
          <div style={{ fontSize: 13, color: '#6b6860', marginBottom: 20, lineHeight: 1.5 }}>
            Votre période d’essai de <strong>14 jours</strong> a commencé.<br />
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
          <div style={{ fontSize: 13, color: '#6b6860', marginTop: 6 }}>14 jours d’essai gratuit · Aucune carte bancaire requise</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>{error}</div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Nom de l’entreprise *</label>
              <input required autoFocus value={form.company_name} onChange={e => updateCompanyName(e.target.value)} placeholder="Ma Société SARL" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Lien entreprise *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8f7f5', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, paddingLeft: 12 }}>
                <span style={{ fontSize: 12, color: '#a8a69e', whiteSpace: 'nowrap' }}>rss.rscomptabilite.com/</span>
                <input required value={form.slug} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="ma-societe" style={{ flex: 1, minWidth: 0, padding: '11px 12px', fontSize: 14, border: 'none', background: 'transparent', color: '#1a1916', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Votre nom *</label>
                <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prénom Nom" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0550 00 00 00" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Email professionnel *</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@votre-entreprise.com" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Mot de passe *</label>
                <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caractères" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6860', marginBottom: 6, display: 'block' }}>Confirmer *</label>
                <input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="Retapez" style={inputStyle} />
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(91,61,245,0.05)', border: '1px solid rgba(91,61,245,0.15)', borderRadius: 8, fontSize: 11, color: '#5B3DF5', marginBottom: 16 }}>
              <strong>✓ Période d’essai 14 jours :</strong> Accès complet à toutes les fonctionnalités.
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, background: loading ? '#a8a69e' : 'linear-gradient(135deg, #2563EB, #5B3DF5)', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Création en cours...' : 'Créer mon entreprise'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#6b6860' }}>
              Déjà un compte ? <Link href="/" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
