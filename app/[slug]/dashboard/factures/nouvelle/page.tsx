'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============== TYPES ==============
type InvoiceItem = {
  id: string
  product_id: string | null
  type: 'product' | 'service'
  name: string
  quantity: number
  unit_price: number
  discount: number
}

// ============== HELPERS ==============
function dzd(v: number) { return v.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) + ' DZD' }
function newId() { return Math.random().toString(36).substring(2, 11) }

// ============== STYLES ==============
const COLORS = {
  primary: '#2563EB', primaryDark: '#1D4ED8', primaryLight: '#EFF6FF',
  bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', borderLight: '#F1F5F9',
  text: '#0F172A', textMuted: '#64748B', textLight: '#94A3B8',
  success: '#16A34A', successLight: '#F0FDF4',
  danger: '#DC2626', dangerLight: '#FEF2F2',
  warning: '#D97706',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: `1px solid ${COLORS.border}`, borderRadius: 8,
  background: '#fff', color: COLORS.text, outline: 'none',
  fontFamily: 'inherit', transition: 'all .15s',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: COLORS.textMuted, marginBottom: 6,
}
const card: React.CSSProperties = {
  background: COLORS.card, border: `1px solid ${COLORS.border}`,
  borderRadius: 12, padding: 24, marginBottom: 16,
}
const cardTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: COLORS.text,
  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
}

// ============== TOGGLE ==============
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 22, borderRadius: 999, border: 'none',
        background: checked ? COLORS.primary : '#CBD5E1',
        position: 'relative', cursor: 'pointer', transition: 'all .2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ============== CLIENT SELECTOR ==============
function ClientSelector({ clients, value, onChange, onCreate }: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setCreating(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = clients.filter((c: any) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const selected = clients.find((c: any) => c.id === value)

  async function handleCreate() {
    if (!newClient.full_name.trim()) return
    setSaving(true)
    const created = await onCreate(newClient)
    if (created) {
      onChange(created.id)
      setOpen(false); setCreating(false)
      setNewClient({ full_name: '', email: '', phone: '' })
    }
    setSaving(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...inp, cursor: 'pointer', minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderColor: open ? COLORS.primary : COLORS.border,
          boxShadow: open ? `0 0 0 3px ${COLORS.primary}15` : 'none',
        }}
      >
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: COLORS.primaryLight, color: COLORS.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {selected.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
            </div>
            <span style={{ fontWeight: 500 }}>{selected.full_name}</span>
          </div>
        ) : (
          <span style={{ color: COLORS.textLight }}>Rechercher ou créer un client...</span>
        )}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: `1px solid ${COLORS.border}`,
          borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ ...inp, padding: '8px 12px', border: `1px solid ${COLORS.borderLight}`, background: COLORS.bg }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: COLORS.textLight, fontSize: 13 }}>
                Aucun client trouvé
              </div>
            ) : filtered.map((c: any) => (
              <div key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); setSearch('') }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: value === c.id ? COLORS.primaryLight : '#fff',
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: COLORS.primaryLight, color: COLORS.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {c.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.full_name}</div>
                  {c.email && <div style={{ fontSize: 11, color: COLORS.textLight }}>{c.email}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: `1px solid ${COLORS.borderLight}` }}>
            {!creating ? (
              <button
                onClick={() => { setCreating(true); setNewClient({ ...newClient, full_name: search }) }}
                style={{
                  width: '100%', padding: 10, borderRadius: 8,
                  border: `1px dashed ${COLORS.primary}40`, background: COLORS.primaryLight,
                  color: COLORS.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                + Créer "{search || 'nouveau client'}"
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input autoFocus style={inp} placeholder="Nom *"
                  value={newClient.full_name} onChange={e => setNewClient({ ...newClient, full_name: e.target.value })} />
                <input style={inp} placeholder="Email"
                  value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                <input style={inp} placeholder="Téléphone"
                  value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={() => setCreating(false)}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${COLORS.border}`, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    Annuler
                  </button>
                  <button onClick={handleCreate} disabled={saving || !newClient.full_name.trim()}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: COLORS.primary, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {saving ? '...' : 'Créer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== PRODUCT SELECTOR ==============
function ProductSelector({ products, value, onChange, onCreate }: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', price: '' })
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setCreating(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = products.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )
  const selected = products.find((p: any) => p.id === value)

  async function handleCreate() {
    if (!newProduct.name || !newProduct.price) return
    setSaving(true)
    const created = await onCreate(newProduct)
    if (created) {
      onChange(created.id, parseFloat(newProduct.price), created.name)
      setOpen(false); setCreating(false)
      setNewProduct({ name: '', price: '' })
    }
    setSaving(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...inp, padding: '8px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: 36,
          borderColor: open ? COLORS.primary : COLORS.border,
        }}
      >
        {selected ? (
          <span style={{ fontWeight: 500, fontSize: 12 }}>{selected.name}</span>
        ) : (
          <span style={{ color: COLORS.textLight, fontSize: 12 }}>Sélectionner...</span>
        )}
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: 280, background: '#fff', border: `1px solid ${COLORS.border}`,
          borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ ...inp, padding: '8px 12px', background: COLORS.bg }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: COLORS.textLight, fontSize: 13 }}>
                Aucun produit
              </div>
            ) : filtered.map((p: any) => (
              <div key={p.id}
                onClick={() => { onChange(p.id, p.price, p.name); setOpen(false); setSearch('') }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: value === p.id ? COLORS.primaryLight : '#fff',
                }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 600 }}>
                  {dzd(p.price)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: `1px solid ${COLORS.borderLight}` }}>
            {!creating ? (
              <button onClick={() => { setCreating(true); setNewProduct({ ...newProduct, name: search }) }}
                style={{
                  width: '100%', padding: 10, borderRadius: 8,
                  border: `1px dashed ${COLORS.primary}40`, background: COLORS.primaryLight,
                  color: COLORS.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                + Créer "{search || 'nouveau produit'}"
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input autoFocus style={inp} placeholder="Nom *"
                  value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                <input type="number" style={inp} placeholder="Prix HT *"
                  value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={() => setCreating(false)}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${COLORS.border}`, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    Annuler
                  </button>
                  <button onClick={handleCreate} disabled={saving || !newProduct.name || !newProduct.price}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: COLORS.primary, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {saving ? '...' : 'Créer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== MAIN PAGE ==============
export default function NouvelleFacturePage() {
  const router = useRouter()
  const { slug } = useParams() as { slug: string }
  
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ===== INVOICE STATE =====
  const [clientId, setClientId] = useState<string>('')
  const [orderNumber, setOrderNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: newId(), product_id: null, type: 'product', name: '', quantity: 1, unit_price: 0, discount: 0 }
  ])
  
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountValue, setDiscountValue] = useState(0)
  
  const [tvaEnabled, setTvaEnabled] = useState(true)
  
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [showNotesPdf, setShowNotesPdf] = useState(true)
  const [showTermsPdf, setShowTermsPdf] = useState(false)

  // ===== LOAD DATA =====
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) { setError('Session invalide'); return }

    const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('clients').select('*').eq('company_id', user.company_id).eq('is_archived', false),
      supabase.from('products').select('*').eq('company_id', user.company_id).eq('is_available', true).eq('is_archived', false),
      supabase.from('settings').select('*').eq('company_id', user.company_id).maybeSingle(),
    ])
    setClients(c || [])
    setProducts(p || [])
    setSettings(s || {})
    
    // Initialiser TVA selon settings
    if (s?.terms_default) setTerms(s.terms_default)
  }

  const tvaRate = settings.tva_rate !== undefined && settings.tva_rate !== null ? Number(settings.tva_rate) : 19

  // ===== ITEM HANDLERS =====
  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setItems(items.map(i => i.id === id ? { ...i, ...patch } : i))
  }
  function addItem() {
    setItems([...items, { id: newId(), product_id: null, type: 'product', name: '', quantity: 1, unit_price: 0, discount: 0 }])
  }
  function removeItem(id: string) {
    if (items.length === 1) return
    setItems(items.filter(i => i.id !== id))
  }

  // ===== CALCULATIONS =====
  const subtotal = items.reduce((sum, i) => sum + Math.max(0, (i.quantity * i.unit_price) - (i.discount || 0)), 0)
  const afterDiscount = discountEnabled && discountValue > 0 ? Math.max(0, subtotal - discountValue) : subtotal
  const tvaAmount = tvaEnabled ? Math.round(afterDiscount * tvaRate / 100 * 100) / 100 : 0
  const total = Math.round((afterDiscount + tvaAmount) * 100) / 100

  // ===== CREATE ENTITY =====
  async function createClient(data: any) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const { data: created } = await supabase.from('clients').insert({
      ...data, created_by: user.id, company_id: user.company_id
    }).select().single()
    if (created) setClients([...clients, created])
    return created
  }

  async function createProduct(data: any) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const { data: created } = await supabase.from('products').insert({
      name: data.name, price: parseFloat(data.price),
      is_available: true, company_id: user.company_id
    }).select().single()
    if (created) setProducts([...products, created])
    return created
  }

  // ===== SAVE =====
  async function saveBill() {
    setError('')
    if (!clientId) { setError('Sélectionnez un client'); return }
    const validItems = items.filter(i => i.product_id && i.quantity > 0)
    if (validItems.length === 0) { setError('Ajoutez au moins une ligne'); return }
    
    setSaving(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      const { data: newBill, error: billErr } = await supabase.from('bills').insert({
        client_id: clientId,
        order_number: orderNumber || null,
        due_date: dueDate || null,
        notes: notes || null,
        terms: terms || null,
        discount_enabled: discountEnabled,
        discount_value: discountValue,
        tva_enabled: tvaEnabled,
        show_notes_pdf: showNotesPdf,
        show_terms_pdf: showTermsPdf,
        total_amount: total,
        subtotal: subtotal,
        tva_amount: tvaAmount,
        created_by: user.id,
        company_id: user.company_id,
      }).select().single()
      
      if (billErr) throw billErr
      if (!newBill) throw new Error('Facture non créée')

      const { error: itemsErr } = await supabase.from('bill_items').insert(
        validItems.map(i => ({
          bill_id: newBill.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount || 0,
          item_type: i.type,
          name_snapshot: i.name,
          company_id: user.company_id,
        }))
      )
      
      if (itemsErr) throw itemsErr
      
      router.push(`/${slug}/dashboard/factures`)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création')
    }
    setSaving(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg,
      margin: -22, padding: 0, fontFamily: 'Inter,Outfit,system-ui,sans-serif',
    }}>
      {/* TOPBAR */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: `1px solid ${COLORS.border}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push(`/${slug}/dashboard/factures`)}
            style={{
              background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.text }}>Nouvelle facture</div>
            <div style={{ fontSize: 11, color: COLORS.textLight }}>Brouillon non enregistré</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push(`/${slug}/dashboard/factures`)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 500,
              background: '#fff', color: COLORS.textMuted, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Annuler
          </button>
          <button onClick={saveBill} disabled={saving}
            style={{
              padding: '10px 22px', fontSize: 13, fontWeight: 600,
              background: saving ? COLORS.textLight : COLORS.primary, color: '#fff',
              border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', boxShadow: `0 1px 3px ${COLORS.primary}40`,
            }}>
            {saving ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '24px',
        display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24,
      }}>
        {/* LEFT — FORM */}
        <div>
          {error && (
            <div style={{
              background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}30`,
              borderRadius: 10, padding: '12px 16px', fontSize: 13, color: COLORS.danger,
              marginBottom: 16,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* INVOICE INFO */}
          <div style={card}>
            <div style={cardTitle}>📋 Informations facture</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div>
                <label style={lbl}>N° Commande</label>
                <input style={inp} placeholder="Ex: CMD-2026-001"
                  value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Date d'émission</label>
                <input type="date" style={inp}
                  value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Date d'échéance</label>
                <input type="date" style={inp}
                  value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* CLIENT */}
          <div style={card}>
            <div style={cardTitle}>👤 Client</div>
            <ClientSelector
              clients={clients} value={clientId}
              onChange={setClientId} onCreate={createClient}
            />
          </div>

          {/* ITEMS */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={cardTitle}>📦 Produits & Services</div>
              <span style={{ fontSize: 11, color: COLORS.textLight, fontWeight: 500 }}>
                {items.filter(i => i.product_id).length} ligne(s)
              </span>
            </div>

            {/* HEADER */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 110px 110px 110px 36px',
              gap: 10, marginBottom: 8, paddingBottom: 8,
              borderBottom: `1px solid ${COLORS.borderLight}`,
            }}>
              {['Désignation', 'Qté', 'Prix HT', 'Remise', 'Total', ''].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, color: COLORS.textLight,
                  textTransform: 'uppercase', letterSpacing: '.5px',
                  textAlign: i >= 1 && i <= 4 ? 'right' : 'left',
                }}>{h}</div>
              ))}
            </div>

            {/* ITEM ROWS */}
            {items.map((item, idx) => {
              const lineTotal = Math.max(0, (item.quantity * item.unit_price) - (item.discount || 0))
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 110px 110px 110px 36px',
                  gap: 10, marginBottom: 8, alignItems: 'center',
                  padding: '10px', background: COLORS.bg, borderRadius: 10,
                }}>
                  <ProductSelector
                    products={products} value={item.product_id}
                    onChange={(id: string, price: number, name: string) =>
                      updateItem(item.id, { product_id: id, unit_price: price, name })
                    }
                    onCreate={createProduct}
                  />
                  <input type="number" min={1} style={{ ...inp, padding: '8px 10px', textAlign: 'right' }}
                    value={item.quantity}
                    onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })} />
                  <input type="number" min={0} step={0.01} style={{ ...inp, padding: '8px 10px', textAlign: 'right' }}
                    value={item.unit_price}
                    onChange={e => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                  <input type="number" min={0} step={0.01} style={{ ...inp, padding: '8px 10px', textAlign: 'right' }}
                    value={item.discount || ''}
                    placeholder="0"
                    onChange={e => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })} />
                  <div style={{
                    textAlign: 'right', fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 13, fontWeight: 700, color: COLORS.text,
                  }}>
                    {lineTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                  </div>
                  <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      border: `1px solid ${COLORS.danger}30`,
                      background: items.length === 1 ? COLORS.borderLight : COLORS.dangerLight,
                      color: items.length === 1 ? COLORS.textLight : COLORS.danger,
                      cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                </div>
              )
            })}

            <button onClick={addItem}
              style={{
                width: '100%', padding: 12, marginTop: 8,
                fontSize: 13, fontWeight: 600, color: COLORS.primary,
                background: COLORS.primaryLight,
                border: `1px dashed ${COLORS.primary}40`, borderRadius: 10,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              + Ajouter une ligne
            </button>
          </div>

          {/* NOTES & TERMS */}
          <div style={card}>
            <div style={cardTitle}>📝 Notes & Conditions</div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Notes (visibles par le client)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>Afficher dans PDF</span>
                  <Toggle checked={showNotesPdf} onChange={setShowNotesPdf} />
                </div>
              </div>
              <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} rows={3}
                placeholder="Note additionnelle pour le client..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Conditions générales</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>Afficher dans PDF</span>
                  <Toggle checked={showTermsPdf} onChange={setShowTermsPdf} />
                </div>
              </div>
              <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} rows={3}
                placeholder="Conditions de paiement, garanties..."
                value={terms} onChange={e => setTerms(e.target.value)} />
            </div>
          </div>
        </div>

        {/* RIGHT — SUMMARY */}
        <div>
          <div style={{ position: 'sticky', top: 84 }}>
            <div style={{
              ...card, padding: 0, overflow: 'hidden', marginBottom: 16,
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>💰 Récapitulatif</span>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: COLORS.textMuted }}>
                  <span>Sous-total</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', color: COLORS.text, fontWeight: 600 }}>
                    {dzd(subtotal)}
                  </span>
                </div>

                {/* Discount toggle */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderTop: `1px solid ${COLORS.borderLight}`, marginTop: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Toggle checked={discountEnabled} onChange={setDiscountEnabled} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Remise globale</span>
                  </div>
                  {discountEnabled && (
                    <input type="number" min={0} style={{
                      ...inp, width: 100, padding: '6px 10px', fontSize: 12, textAlign: 'right',
                    }} value={discountValue}
                      onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} />
                  )}
                </div>

                {discountEnabled && discountValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: COLORS.success }}>
                    <span>− Remise</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                      − {dzd(discountValue)}
                    </span>
                  </div>
                )}

                {/* TVA toggle */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderTop: `1px solid ${COLORS.borderLight}`, marginTop: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Toggle checked={tvaEnabled} onChange={setTvaEnabled} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>TVA ({tvaRate}%)</span>
                  </div>
                  {tvaEnabled && (
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                      {dzd(tvaAmount)}
                    </span>
                  )}
                </div>

                {/* TOTAL */}
                <div style={{
                  marginTop: 12, padding: '14px 16px',
                  background: COLORS.primary, borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '.5px' }}>
                    TOTAL TTC
                  </span>
                  <span style={{
                    color: '#fff', fontSize: 20, fontWeight: 800,
                    fontFamily: 'JetBrains Mono,monospace',
                  }}>
                    {dzd(total)}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={saveBill} disabled={saving}
              style={{
                width: '100%', padding: 14, fontSize: 14, fontWeight: 700,
                background: saving ? COLORS.textLight : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                color: '#fff', border: 'none', borderRadius: 10,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                boxShadow: `0 4px 14px ${COLORS.primary}40`,
              }}>
              {saving ? 'Création en cours...' : '✓ Créer la facture'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 10, color: COLORS.textLight, marginTop: 16 }}>
              Données isolées par entreprise · Multi-tenant sécurisé
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}