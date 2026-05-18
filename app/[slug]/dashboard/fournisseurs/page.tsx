'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'inherit', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnG: React.CSSProperties = { background:'#fff', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }

function emptyForm() {
  return {
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    default_currency: 'DZD',
    notes: '',
  }
}

export default function FournisseursPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])
  useRealtime(['suppliers', 'expenses', 'purchase_documents'], load, { intervalMs: 4000 })

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [{ data: supplierRows }, { data: expenseRows }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', user.company_id).eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('expenses').select('id,supplier_id,total_amount,payment_status').eq('company_id', user.company_id),
    ])
    setSuppliers(supplierRows || [])
    setExpenses(expenseRows || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  function openEdit(row: any) {
    setEditing(row)
    setForm({
      name: row.name || '',
      contact_name: row.contact_name || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      tax_number: row.tax_number || '',
      default_currency: row.default_currency || 'DZD',
      notes: row.notes || '',
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id || !form.name.trim()) {
      setError('Le nom du fournisseur est obligatoire.')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      ...form,
      name: form.name.trim(),
      updated_at: new Date().toISOString(),
    }

    const result = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing.id)
      : await supabase.from('suppliers').insert({
          ...payload,
          company_id: user.company_id,
          created_by: user.id,
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(editing ? 'Fournisseur mis a jour.' : 'Fournisseur cree.')
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function archiveSupplier(id: string) {
    if (!confirm('Archiver ce fournisseur ?')) return
    const { error } = await supabase.from('suppliers').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('Fournisseur archive.')
    load()
  }

  const expenseStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; pending: number }>()
    for (const row of expenses) {
      const key = String(row.supplier_id || '')
      if (!key) continue
      const current = map.get(key) || { count: 0, total: 0, pending: 0 }
      current.count += 1
      current.total += Number(row.total_amount || 0)
      if (row.payment_status !== 'paid') current.pending += Number(row.total_amount || 0)
      map.set(key, current)
    }
    return map
  }, [expenses])

  const filtered = suppliers.filter((row) => {
    const haystack = [row.name, row.contact_name, row.email, row.phone, row.tax_number].join(' ').toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Fournisseurs</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Carnet d achat pour vos bons d achat et depenses.</div>
        </div>
        <button style={btnP} onClick={openCreate}>Nouveau fournisseur</button>
      </div>

      {message && <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',color:'#15803d',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:14}}>{message}</div>}
      {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:14}}>{error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>Total fournisseurs</div>
          <div style={{fontSize:22,fontWeight:700,color:'#1a1916',marginTop:8}}>{suppliers.length}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>Fournisseurs avec depenses</div>
          <div style={{fontSize:22,fontWeight:700,color:'#2563EB',marginTop:8}}>{Array.from(expenseStats.keys()).length}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>Sorties en attente</div>
          <div style={{fontSize:22,fontWeight:700,color:'#d97706',marginTop:8}}>
            {(expenses.filter((row) => row.payment_status !== 'paid').reduce((sum, row) => sum + Number(row.total_amount || 0), 0)).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un fournisseur..." style={{...inp, maxWidth:360, background:'#fff'}} />
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Fournisseur', 'Contact', 'Coordonnees', 'Devise', 'Depenses', 'En attente', 'Actions'].map((header) => (
                <th key={header} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 12px',textAlign:'left'}}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{padding:28,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{padding:28,textAlign:'center',color:'#a8a69e'}}>Aucun fournisseur pour le moment.</td></tr>
            ) : filtered.map((row) => {
              const stats = expenseStats.get(row.id) || { count: 0, total: 0, pending: 0 }
              return (
                <tr key={row.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1a1916'}}>{row.name}</div>
                    {row.tax_number && <div style={{fontSize:11,color:'#6b6860',marginTop:4}}>NIF/RC: {row.tax_number}</div>}
                  </td>
                  <td style={{padding:'12px',fontSize:12,color:'#6b6860'}}>{row.contact_name || '—'}</td>
                  <td style={{padding:'12px',fontSize:12,color:'#6b6860'}}>
                    <div>{row.email || '—'}</div>
                    <div style={{marginTop:4}}>{row.phone || '—'}</div>
                  </td>
                  <td style={{padding:'12px',fontSize:12,fontWeight:700,color:'#2563EB'}}>{row.default_currency || 'DZD'}</td>
                  <td style={{padding:'12px',fontSize:12,color:'#1a1916'}}>{stats.count} sortie(s)</td>
                  <td style={{padding:'12px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:stats.pending > 0 ? '#d97706' : '#16a34a'}}>
                    {stats.pending.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                  </td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button style={{...btnG,padding:'6px 10px',fontSize:12}} onClick={() => openEdit(row)}>Modifier</button>
                      <button style={{padding:'6px 10px',fontSize:12,borderRadius:6,border:'1px solid rgba(220,38,38,0.18)',background:'rgba(220,38,38,0.05)',color:'#dc2626',cursor:'pointer',fontFamily:'inherit'}} onClick={() => archiveSupplier(row.id)}>Archiver</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.44)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,zIndex:100}} onClick={() => setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:12,padding:24,width:'100%',maxWidth:720}} onClick={(event) => event.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,color:'#1a1916',marginBottom:4}}>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</div>
            <div style={{fontSize:12,color:'#6b6860',marginBottom:18}}>Ces informations seront reutilisables dans les achats et les depenses.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={lbl}>Nom du fournisseur *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Contact</label>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Telephone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Devise par defaut</label>
                <select value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} style={inp}>
                  {['DZD', 'EUR', 'USD', 'CNY', 'GBP', 'MAD', 'TND'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>NIF / RC</label>
                <input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} style={inp} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Adresse</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inp} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{...inp, resize:'vertical'}} />
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
              <button style={btnG} onClick={() => setShowForm(false)}>Annuler</button>
              <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
