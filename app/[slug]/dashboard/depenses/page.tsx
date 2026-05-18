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
    supplier_id: '',
    expense_date: new Date().toISOString().slice(0, 10),
    category: 'General',
    description: '',
    reference_number: '',
    amount: '0',
    tax_rate: '0',
    currency: 'DZD',
    payment_status: 'pending',
    notes: '',
  }
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export default function DepensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  useRealtime(['expenses', 'suppliers'], load, { intervalMs: 4000 })

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [{ data: expenseRows }, { data: supplierRows }] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, suppliers(name)')
        .eq('company_id', user.company_id)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('suppliers')
        .select('id,name,default_currency')
        .eq('company_id', user.company_id)
        .eq('is_archived', false)
        .order('name'),
    ])

    setExpenses(expenseRows || [])
    setSuppliers(supplierRows || [])
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
      supplier_id: row.supplier_id || '',
      expense_date: row.expense_date || new Date().toISOString().slice(0, 10),
      category: row.category || 'General',
      description: row.description || '',
      reference_number: row.reference_number || '',
      amount: String(row.amount || 0),
      tax_rate: String(row.tax_rate || 0),
      currency: row.currency || 'DZD',
      payment_status: row.payment_status || 'pending',
      notes: row.notes || '',
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const baseAmount = Number(form.amount || 0)
    const taxRate = Number(form.tax_rate || 0)
    const taxAmount = roundMoney(baseAmount * taxRate / 100)
    const totalAmount = roundMoney(baseAmount + taxAmount)

    if (!user.company_id || !form.description.trim()) {
      setError('La description de la depense est obligatoire.')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      supplier_id: form.supplier_id || null,
      expense_date: form.expense_date,
      category: form.category || 'General',
      description: form.description.trim(),
      reference_number: form.reference_number.trim() || null,
      amount: baseAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: form.currency || 'DZD',
      payment_status: form.payment_status || 'pending',
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const result = editing
      ? await supabase.from('expenses').update(payload).eq('id', editing.id)
      : await supabase.from('expenses').insert({
          ...payload,
          company_id: user.company_id,
          created_by: user.id,
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(editing ? 'Depense mise a jour.' : 'Depense enregistree.')
    setShowForm(false)
    setSaving(false)
    load()
  }

  const totals = useMemo(() => ({
    total: expenses.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    pending: expenses.filter((row) => row.payment_status !== 'paid').reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    paid: expenses.filter((row) => row.payment_status === 'paid').reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
  }), [expenses])

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Depenses</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Suivi des sorties, frais et achats hors stock.</div>
        </div>
        <button style={btnP} onClick={openCreate}>Nouvelle depense</button>
      </div>

      {message && <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',color:'#15803d',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:14}}>{message}</div>}
      {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:14}}>{error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>Total depenses</div>
          <div style={{fontSize:22,fontWeight:700,color:'#1a1916',marginTop:8}}>{totals.total.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>Payees</div>
          <div style={{fontSize:22,fontWeight:700,color:'#16a34a',marginTop:8}}>{totals.paid.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>En attente</div>
          <div style={{fontSize:22,fontWeight:700,color:'#d97706',marginTop:8}}>{totals.pending.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:940}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Date', 'Description', 'Categorie', 'Fournisseur', 'Montant HT', 'TVA', 'Total TTC', 'Statut', 'Actions'].map((header) => (
                <th key={header} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 12px',textAlign:'left'}}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{padding:28,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={9} style={{padding:28,textAlign:'center',color:'#a8a69e'}}>Aucune depense enregistree.</td></tr>
            ) : expenses.map((row) => (
              <tr key={row.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                <td style={{padding:'12px',fontSize:12,color:'#6b6860'}}>{new Date(row.expense_date).toLocaleDateString('fr-DZ')}</td>
                <td style={{padding:'12px'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1a1916'}}>{row.description}</div>
                  {row.reference_number && <div style={{fontSize:11,color:'#6b6860',marginTop:4}}>Ref: {row.reference_number}</div>}
                </td>
                <td style={{padding:'12px',fontSize:12,color:'#6b6860'}}>{row.category}</td>
                <td style={{padding:'12px',fontSize:12,color:'#1a1916'}}>{row.suppliers?.name || '—'}</td>
                <td style={{padding:'12px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#1a1916'}}>{Number(row.amount || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} {row.currency}</td>
                <td style={{padding:'12px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#2563EB'}}>{Number(row.tax_amount || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} {row.currency}</td>
                <td style={{padding:'12px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a',fontWeight:700}}>{Number(row.total_amount || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} {row.currency}</td>
                <td style={{padding:'12px'}}>
                  <span style={{fontSize:11,padding:'4px 8px',borderRadius:999,background:row.payment_status === 'paid' ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.12)',color:row.payment_status === 'paid' ? '#15803d' : '#b45309',fontWeight:700}}>
                    {row.payment_status === 'paid' ? 'Payee' : 'En attente'}
                  </span>
                </td>
                <td style={{padding:'12px'}}>
                  <button style={{...btnG,padding:'6px 10px',fontSize:12}} onClick={() => openEdit(row)}>Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.44)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,zIndex:100}} onClick={() => setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:12,padding:24,width:'100%',maxWidth:760}} onClick={(event) => event.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,color:'#1a1916',marginBottom:4}}>{editing ? 'Modifier la depense' : 'Nouvelle depense'}</div>
            <div style={{fontSize:12,color:'#6b6860',marginBottom:18}}>Enregistrez les frais generaux, transport, loyers ou achats hors stock.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={lbl}>Description *</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fournisseur</label>
                <select value={form.supplier_id} onChange={(e) => {
                  const supplier = suppliers.find((row) => row.id === e.target.value)
                  setForm({ ...form, supplier_id: e.target.value, currency: supplier?.default_currency || form.currency })
                }} style={inp}>
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Categorie</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inp}>
                  {['General', 'Transport', 'Douane', 'Loyer', 'Maintenance', 'Marketing', 'Salaire', 'Services'].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Montant HT</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Taux TVA %</label>
                <input type="number" min="0" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Devise</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inp}>
                  {['DZD', 'EUR', 'USD', 'CNY', 'GBP', 'MAD', 'TND'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Statut paiement</label>
                <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} style={inp}>
                  <option value="pending">En attente</option>
                  <option value="paid">Payee</option>
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Reference</label>
                <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} style={inp} />
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{...inp, resize:'vertical'}} />
              </div>
            </div>

            <div style={{marginTop:14,padding:'12px 14px',background:'rgba(37,99,235,0.05)',border:'1px solid rgba(37,99,235,0.12)',borderRadius:8,fontSize:12,color:'#6b6860'}}>
              TVA calculee: {roundMoney(Number(form.amount || 0) * Number(form.tax_rate || 0) / 100).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} {form.currency}
              <br />
              Total TTC: {roundMoney(Number(form.amount || 0) + (Number(form.amount || 0) * Number(form.tax_rate || 0) / 100)).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} {form.currency}
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
