'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }
function dzdShort(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnG: React.CSSProperties = { background:'transparent', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif' }
const btnGr: React.CSSProperties = { background:'#16a34a', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

function StatusBadge({ s }: { s: string }) {
  const map: Record<string,any> = {
    payé: { bg:'rgba(22,163,74,0.1)', color:'#15803d', border:'rgba(22,163,74,0.2)', label:'● Payé' },
    partiel: { bg:'rgba(217,119,6,0.1)', color:'#b45309', border:'rgba(217,119,6,0.2)', label:'◐ Partiel' },
    impayé: { bg:'rgba(220,38,38,0.08)', color:'#dc2626', border:'rgba(220,38,38,0.15)', label:'○ Impayé' },
  }
  const m = map[s]||map.impayé
  return <span style={{background:m.bg,color:m.color,border:`1px solid ${m.border}`,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap'}}>{m.label}</span>
}

// ===== SMART SELECT CLIENT =====
function ClientSelect({ options, value, onChange, onAdd }: any) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [newC, setNewC] = useState({ full_name:'', email:'', phone:'', wilaya:'' })
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setQ('') } }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = options.filter((o:any) => o.full_name?.toLowerCase().includes(q.toLowerCase()))
  const selected = options.find((o:any) => o.id === value)

  async function handleAdd() {
    if (!newC.full_name.trim()) return
    setSaving(true)
    const created = await onAdd(newC)
    if (created) { onChange(created.id); setOpen(false); setAdding(false); setNewC({full_name:'',email:'',phone:'',wilaya:''}) }
    setSaving(false)
  }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={()=>{setOpen(!open);setQ('')}}
        style={{background:'#f0eeea',border:`1.5px solid ${open?'#2563EB':'rgba(0,0,0,0.14)'}`,borderRadius:7,padding:'10px 14px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:44,transition:'all .15s'}}>
        {selected ? (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(37,99,235,0.12)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>
              {selected.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
            </div>
            <div><div style={{fontSize:13,fontWeight:600}}>{selected.full_name}</div>{selected.email && <div style={{fontSize:11,color:'#a8a69e'}}>{selected.email}</div>}</div>
          </div>
        ) : <span style={{color:'#a8a69e'}}>Rechercher ou créer un client...</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2" style={{transform:open?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid rgba(0,0,0,0.12)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:500,overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'#f8f7f5',borderRadius:6,padding:'7px 10px'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input autoFocus style={{background:'none',border:'none',outline:'none',fontSize:13,width:'100%',fontFamily:'Outfit,sans-serif'}} placeholder="Rechercher un client..." value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
          </div>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            {filtered.length === 0 ? (
              <div style={{padding:16,textAlign:'center',color:'#a8a69e',fontSize:13}}>{q ? `Aucun client "${q}"` : 'Aucun client'}</div>
            ) : filtered.map((o:any)=>(
              <div key={o.id} onClick={()=>{onChange(o.id);setOpen(false);setQ('')}}
                style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:value===o.id?'rgba(37,99,235,0.05)':'#fff',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                {value===o.id && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(37,99,235,0.1)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>
                  {o.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{o.full_name}</div>
                  {(o.email||o.phone) && <div style={{fontSize:11,color:'#a8a69e'}}>{o.email||o.phone}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid rgba(0,0,0,0.07)',padding:'8px 10px'}}>
            {!adding ? (
              <button onClick={()=>{setAdding(true);setNewC({...newC,full_name:q})}}
                style={{width:'100%',padding:'9px',borderRadius:6,border:'1px dashed rgba(37,99,235,0.3)',background:'rgba(37,99,235,0.04)',color:'#2563EB',fontSize:13,cursor:'pointer',fontFamily:'Outfit,sans-serif',display:'flex',alignItems:'center',gap:7,justifyContent:'center'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Créer "{q||'nouveau client'}"
              </button>
            ) : (
              <div style={{background:'rgba(37,99,235,0.04)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:8,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#2563EB',marginBottom:10}}>Nouveau client</div>
                <input autoFocus style={{...inp,marginBottom:6,background:'#fff'}} placeholder="Nom complet *" value={newC.full_name} onChange={e=>setNewC({...newC,full_name:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                  <input style={{...inp,background:'#fff'}} placeholder="Email" value={newC.email} onChange={e=>setNewC({...newC,email:e.target.value})}/>
                  <input style={{...inp,background:'#fff'}} placeholder="Téléphone" value={newC.phone} onChange={e=>setNewC({...newC,phone:e.target.value})}/>
                </div>
                <input style={{...inp,marginBottom:8,background:'#fff'}} placeholder="Wilaya" value={newC.wilaya} onChange={e=>setNewC({...newC,wilaya:e.target.value})}/>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>{setAdding(false);setNewC({full_name:'',email:'',phone:'',wilaya:''})}} style={{flex:1,padding:7,borderRadius:5,border:'1px solid rgba(0,0,0,0.12)',background:'#fff',color:'#6b6860',cursor:'pointer',fontSize:12,fontFamily:'Outfit,sans-serif'}}>Annuler</button>
                  <button onClick={handleAdd} disabled={saving||!newC.full_name.trim()} style={{flex:1,padding:7,borderRadius:5,border:'none',background:'#2563EB',color:'#fff',cursor:'pointer',fontSize:12,fontFamily:'Outfit,sans-serif',opacity:saving||!newC.full_name.trim()?0.6:1}}>{saving?'...':'Créer'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== SMART SELECT PRODUCT =====
function ProductSelect({ products, value, onChange, onAdd }: any) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [newP, setNewP] = useState({ name:'', price:'', category:'Service' })
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdding(false); setQ('') } }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = products.filter((p:any) => p.name?.toLowerCase().includes(q.toLowerCase()))
  const selected = products.find((p:any) => p.id === value)

  async function handleAdd() {
    if (!newP.name||!newP.price) return
    setSaving(true)
    const created = await onAdd(newP)
    if (created) { onChange(created.id, parseFloat(newP.price)); setOpen(false); setAdding(false); setNewP({name:'',price:'',category:'Service'}) }
    setSaving(false)
  }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={()=>{setOpen(!open);setQ('')}}
        style={{background:'#f8f7f5',border:`1.5px solid ${open?'#2563EB':'rgba(0,0,0,0.12)'}`,borderRadius:6,padding:'8px 10px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:36}}>
        {selected ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
            <span style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.name}</span>
          </div>
        ) : <span style={{color:'#a8a69e'}}>Sélectionner...</span>}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2" style={{marginLeft:4,flexShrink:0,transform:open?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid rgba(0,0,0,0.12)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:500,overflow:'hidden',minWidth:280}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'#f8f7f5',borderRadius:6,padding:'7px 10px'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input autoFocus style={{background:'none',border:'none',outline:'none',fontSize:13,width:'100%',fontFamily:'Outfit,sans-serif'}} placeholder="Rechercher un produit..." value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
          </div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {filtered.length === 0 ? (
              <div style={{padding:14,textAlign:'center',color:'#a8a69e',fontSize:13}}>{q?`Aucun produit "${q}"`:'Aucun produit'}</div>
            ) : filtered.map((p:any)=>(
              <div key={p.id} onClick={()=>{onChange(p.id,p.price);setOpen(false);setQ('')}}
                style={{padding:'10px 14px',cursor:'pointer',background:value===p.id?'rgba(37,99,235,0.05)':'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {value===p.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                    <div style={{fontSize:10,color:'#a8a69e'}}>{p.category}</div>
                  </div>
                </div>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'#16a34a'}}>{dzdShort(p.price)}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid rgba(0,0,0,0.07)',padding:'8px 10px'}}>
            {!adding ? (
              <button onClick={()=>{setAdding(true);setNewP({...newP,name:q})}}
                style={{width:'100%',padding:9,borderRadius:6,border:'1px dashed rgba(37,99,235,0.3)',background:'rgba(37,99,235,0.04)',color:'#2563EB',fontSize:13,cursor:'pointer',fontFamily:'Outfit,sans-serif',display:'flex',alignItems:'center',gap:7,justifyContent:'center'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Créer "{q||'nouveau produit'}"
              </button>
            ) : (
              <div style={{background:'rgba(37,99,235,0.04)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:8,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#2563EB',marginBottom:10}}>Nouveau produit</div>
                <input autoFocus style={{...inp,marginBottom:6,background:'#fff'}} placeholder="Nom *" value={newP.name} onChange={e=>setNewP({...newP,name:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                  <input type="number" style={{...inp,background:'#fff'}} placeholder="Prix HT *" value={newP.price} onChange={e=>setNewP({...newP,price:e.target.value})}/>
                  <select style={{...inp,background:'#fff',appearance:'none'}} value={newP.category} onChange={e=>setNewP({...newP,category:e.target.value})}>
                    <option>Service</option><option>Produit</option><option>Abonnement</option>
                  </select>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setAdding(false)} style={{flex:1,padding:7,borderRadius:5,border:'1px solid rgba(0,0,0,0.12)',background:'#fff',color:'#6b6860',cursor:'pointer',fontSize:12,fontFamily:'Outfit,sans-serif'}}>Annuler</button>
                  <button onClick={handleAdd} disabled={saving||!newP.name||!newP.price} style={{flex:1,padding:7,borderRadius:5,border:'none',background:'#2563EB',color:'#fff',cursor:'pointer',fontSize:12,fontFamily:'Outfit,sans-serif',opacity:saving||!newP.name||!newP.price?0.6:1}}>{saving?'...':'Créer'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== PDF FACTURE =====
async function generatePDF(bill: any, settings: any) {
  // Fetch fresh data
  const [{ data: items }, { data: pays }, { data: freshSettings }] = await Promise.all([
    supabase.from('bill_items').select('*, products(name, description)').eq('bill_id', bill.id),
    supabase.from('payments').select('*, users:created_by(full_name)').eq('bill_id', bill.id).order('created_at', { ascending: true }),
    supabase.from('settings').select('*').single()
  ])
  const s = freshSettings || settings || {}
  const allItems = items || []
  const allPays = pays || []

  const win = window.open('', '_blank', 'width=850,height=950')
  if (!win) { alert('Veuillez autoriser les popups pour télécharger le PDF'); return }

  const totalHT = allItems.reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const tvaRate = s.tva_rate || 19
  const tva = totalHT * tvaRate / 100
  const color = s.primary_color || '#2563EB'
  const company = s.company_name || 'ABOU IYAD'

  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${bill.invoice_number} - ${company}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
body{background:#f5f5f5;padding:20px;color:#1a1916}
.page{background:#fff;max-width:210mm;margin:0 auto;padding:45px;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-radius:4px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid ${color};padding-bottom:22px;margin-bottom:30px}
.company-info h1{font-size:24px;color:${color};margin-bottom:6px;letter-spacing:-0.5px;font-weight:700}
.company-info .tagline{font-size:10px;color:${color};opacity:0.8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;font-weight:600}
.company-info p{font-size:11px;color:#555;line-height:1.6}
.doc-info{text-align:right;min-width:220px}
.doc-info h2{font-size:32px;color:#1a1916;margin-bottom:8px;letter-spacing:2px;font-weight:700}
.doc-info .num{font-family:'Courier New',monospace;color:${color};font-weight:700;font-size:15px;background:${color}15;padding:6px 12px;border-radius:6px;display:inline-block;margin-bottom:6px}
.doc-info .dates{font-size:11px;color:#666;line-height:1.8;margin-top:8px}
.doc-info .dates strong{color:#1a1916}
.status-tag{display:inline-block;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-top:10px;text-transform:uppercase;letter-spacing:0.5px}
.status-tag.paid{background:#dcfce7;color:#15803d;border:1px solid #86efac}
.status-tag.partial{background:#fef3c7;color:#b45309;border:1px solid #fcd34d}
.status-tag.unpaid{background:#fee2e2;color:#dc2626;border:1px solid #fca5a5}
.client-section{background:#fafaf8;border-left:4px solid ${color};padding:18px 22px;border-radius:6px;margin-bottom:26px}
.client-section .label{font-size:10px;color:${color};text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px}
.client-section .name{font-size:16px;font-weight:700;color:#1a1916;margin-bottom:6px}
.client-section .detail{font-size:12px;color:#555;margin:3px 0;display:flex;align-items:center;gap:8px}
table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
thead th{background:${color};color:#fff;padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600}
thead th.right{text-align:right}
tbody td{padding:12px 14px;border-bottom:1px solid #eee;font-size:12px;background:#fff}
tbody td.right{text-align:right;font-family:'Courier New',monospace;font-weight:600}
tbody tr:nth-child(even) td{background:#fafaf8}
tbody tr:last-child td{border-bottom:none}
.totals-block{display:flex;justify-content:flex-end;margin-bottom:30px}
.totals-box{min-width:300px;background:#fafaf8;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5}
.totals-box .row{display:flex;justify-content:space-between;padding:10px 18px;font-size:13px}
.totals-box .row.sub{color:#555}
.totals-box .row.sub:not(:last-child){border-bottom:1px solid #eee}
.totals-box .row.total{background:${color};color:#fff;font-weight:700;font-size:16px;padding:14px 18px;letter-spacing:0.3px}
.totals-box .mono{font-family:'Courier New',monospace}
.payments-section{background:linear-gradient(135deg,${color}08,${color}04);border:1px solid ${color}20;border-radius:8px;padding:18px 22px;margin-bottom:24px}
.payments-section h3{font-size:12px;color:${color};margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;display:flex;align-items:center;gap:8px}
.payment-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;font-size:12px;border-bottom:1px solid ${color}15}
.payment-row:last-child{border-bottom:none;padding-top:12px;margin-top:6px;border-top:2px solid ${color}30;font-weight:700;font-size:14px}
.payment-row .method-pill{background:${color}15;color:${color};padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px}
.payment-row .ref{font-family:'Courier New',monospace;font-size:10px;color:#888;margin-left:8px}
.payment-amount{font-family:'Courier New',monospace;font-weight:700;color:#15803d}
.balance-box{background:${bill.total_amount - bill.paid_amount > 0 ? '#fff7ed' : '#f0fdf4'};border:2px solid ${bill.total_amount - bill.paid_amount > 0 ? '#fb923c' : '#22c55e'};border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:24px}
.balance-box .label{font-size:11px;color:${bill.total_amount - bill.paid_amount > 0 ? '#b45309' : '#15803d'};text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px}
.balance-box .val{font-size:24px;font-family:'Courier New',monospace;font-weight:700;color:${bill.total_amount - bill.paid_amount > 0 ? '#d97706' : '#15803d'}}
.footer{border-top:2px solid ${color};padding-top:18px;margin-top:40px;font-size:10px;color:#777;text-align:center;line-height:1.8}
.footer .conditions{font-size:11px;color:#555;margin-bottom:14px;font-style:italic}
.footer .company-foot{font-weight:600;color:#1a1916;font-size:11px}
.dev-credit{margin-top:10px;font-size:9px;color:#bbb;border-top:1px solid #eee;padding-top:10px}
.dev-credit strong{color:${color}}
@media print {body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}.no-print{display:none !important}}
.toolbar{position:fixed;top:15px;right:15px;display:flex;gap:10px;z-index:100;background:#fff;padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.toolbar button{padding:9px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-family:Arial;font-weight:600}
.btn-print{background:${color};color:#fff}.btn-print:hover{opacity:0.9}
.btn-close{background:#f5f5f5;color:#666;border:1px solid #ddd}
</style></head><body>
<div class="toolbar no-print">
  <button class="btn-print" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Fermer</button>
</div>
<div class="page">
  <div class="header">
    <div class="company-info">
      ${s.logo_url ? `<img src="${s.logo_url}" style="max-height:60px;margin-bottom:8px" alt="Logo"/>` : ''}
      <h1>${company}</h1>
      <div class="tagline">Développé par RS Comptabilité</div>
      <p>
        ${s.address ? `${s.address}<br>` : ''}
        ${s.phone ? `📞 ${s.phone}` : ''} ${s.email ? ` · ✉ ${s.email}` : ''}<br>
        ${s.website ? `🌐 ${s.website}<br>` : ''}
        ${s.tax_number ? `<strong>NIF/RC :</strong> ${s.tax_number}` : ''}
      </p>
    </div>
    <div class="doc-info">
      <h2>FACTURE</h2>
      <div class="num">${bill.invoice_number}</div>
      <div class="dates">
        <strong>Émise le :</strong> ${new Date(bill.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })}<br>
      </div>
      <div class="status-tag ${bill.status === 'payé' ? 'paid' : bill.status === 'partiel' ? 'partial' : 'unpaid'}">
        ${bill.status === 'payé' ? '● Payée' : bill.status === 'partiel' ? '◐ Partielle' : '○ Impayée'}
      </div>
    </div>
  </div>

  <div class="client-section">
    <div class="label">Facturé à</div>
    <div class="name">${bill.clients?.full_name || ''}</div>
    ${bill.clients?.email ? `<div class="detail">✉ ${bill.clients.email}</div>` : ''}
    ${bill.clients?.phone ? `<div class="detail">☎ ${bill.clients.phone}</div>` : ''}
    ${bill.clients?.address || bill.clients?.wilaya ? `<div class="detail">📍 ${bill.clients.address || ''}${bill.clients.wilaya ? `, ${bill.clients.wilaya}` : ''}</div>` : ''}
  </div>

  <table>
    <thead><tr><th style="width:50%">Désignation</th><th class="right">Qté</th><th class="right">Prix HT</th><th class="right">Total HT</th></tr></thead>
    <tbody>
      ${allItems.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:#999;padding:30px;font-style:italic">Facture globale — Voir montant total ci-dessous</td></tr>` : allItems.map((i: any) => `
        <tr>
          <td><strong>${i.products?.name || 'Article'}</strong>${i.products?.description ? `<br><span style="font-size:10px;color:#888">${i.products.description}</span>` : ''}</td>
          <td class="right">${i.quantity}</td>
          <td class="right">${i.unit_price.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
          <td class="right">${i.total.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-block">
    <div class="totals-box">
      ${allItems.length > 0 ? `
        <div class="row sub"><span>Sous-total HT</span><span class="mono">${totalHT.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span></div>
        <div class="row sub"><span>TVA (${tvaRate}%)</span><span class="mono">${tva.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span></div>
      ` : ''}
      <div class="row total"><span>TOTAL TTC</span><span class="mono">${bill.total_amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span></div>
    </div>
  </div>

  ${allPays.length > 0 ? `
    <div class="payments-section">
      <h3>💳 Historique des règlements (${allPays.length})</h3>
      ${allPays.map((p: any) => `
        <div class="payment-row">
          <div>
            <span class="method-pill">${p.method}</span>
            <span style="margin-left:10px">${new Date(p.created_at).toLocaleDateString('fr-DZ')}</span>
            <span class="ref">Réf: ${p.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <span class="payment-amount">+${p.amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span>
        </div>
      `).join('')}
      <div class="payment-row">
        <span>Total encaissé</span>
        <span class="payment-amount" style="font-size:16px">${bill.paid_amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span>
      </div>
    </div>
  ` : ''}

  ${bill.total_amount - bill.paid_amount > 0 ? `
    <div class="balance-box">
      <div class="label">Solde restant à régler</div>
      <div class="val">${(bill.total_amount - bill.paid_amount).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
    </div>
  ` : `
    <div class="balance-box">
      <div class="label">✓ Facture entièrement réglée</div>
      <div class="val">MERCI</div>
    </div>
  `}

  <div class="footer">
    <div class="conditions">${s.footer_text || 'Merci de votre confiance. Paiement par virement sous 15 jours.'}</div>
    <div class="company-foot">${company}${s.phone ? ` · ${s.phone}` : ''}${s.email ? ` · ${s.email}` : ''}</div>
    <div class="dev-credit">
      Document généré le ${new Date().toLocaleString('fr-DZ')}<br>
      Système de gestion <strong>${company}</strong> — Développé par <strong>RS Comptabilité</strong>
    </div>
  </div>
</div>
</body></html>`)
  win.document.close()
}

// ===== PDF RECU PAIEMENT =====
async function generateReceiptPDF(payment: any, bill: any, settings: any) {
  // Fetch fresh data
  const [{ data: freshBill }, { data: freshSettings }, { data: paidUser }] = await Promise.all([
    supabase.from('bills').select('*, clients(full_name,email,phone,address,wilaya)').eq('id', bill.id).single(),
    supabase.from('settings').select('*').single(),
    payment.created_by ? supabase.from('users').select('full_name').eq('id', payment.created_by).single() : Promise.resolve({ data: null })
  ])
  const s = freshSettings || settings || {}
  const b = freshBill || bill
  const enregistrePar = paidUser?.full_name || 'Système'

  const win = window.open('', '_blank', 'width=750,height=900')
  if (!win) { alert('Veuillez autoriser les popups'); return }
  const color = s.primary_color || '#2563EB'
  const company = s.company_name || 'ABOU IYAD'
  const refNum = payment.id?.slice(0, 8).toUpperCase() || 'XXXXXX'

  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${refNum} - ${company}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
body{background:#f5f5f5;padding:20px;color:#1a1916}
.page{background:#fff;max-width:160mm;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-radius:8px;overflow:hidden}
.header{background:linear-gradient(135deg,${color},${color}dd);color:#fff;padding:30px;text-align:center;position:relative}
.header::after{content:'';position:absolute;bottom:-10px;left:50%;transform:translateX(-50%) rotate(45deg);width:20px;height:20px;background:linear-gradient(135deg,${color}dd,${color})}
.header h1{font-size:22px;margin-bottom:6px;letter-spacing:-0.3px}
.header .tagline{font-size:10px;opacity:0.9;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:14px}
.header h2{font-size:14px;background:rgba(255,255,255,0.2);display:inline-block;padding:6px 20px;border-radius:20px;letter-spacing:3px;font-weight:600}
.content{padding:30px}
.ref-number{text-align:center;margin-bottom:20px;color:#999;font-size:11px;font-family:'Courier New',monospace;letter-spacing:1.5px}
.ref-number strong{color:${color};font-size:13px;background:${color}15;padding:4px 12px;border-radius:6px;margin-left:6px}
.big-amount{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:3px dashed #16a34a;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;position:relative}
.big-amount::before{content:'';position:absolute;top:-2px;right:-2px;width:60px;height:60px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:24px;font-weight:700;transform:translate(20%,-20%) rotate(15deg);box-shadow:0 4px 12px rgba(22,163,74,0.3)}
.big-amount .label{font-size:11px;color:#16a34a;text-transform:uppercase;font-weight:700;letter-spacing:1.5px;margin-bottom:8px}
.big-amount .val{font-size:36px;color:#15803d;font-family:'Courier New',monospace;font-weight:700;letter-spacing:-1px}
.big-amount .method{margin-top:10px;display:inline-block;background:#fff;color:#16a34a;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #86efac}
.section{background:#fafaf8;border-radius:8px;padding:16px 20px;margin-bottom:14px}
.section-title{font-size:10px;color:${color};text-transform:uppercase;font-weight:700;letter-spacing:1.2px;margin-bottom:10px}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:12px;border-bottom:1px dashed #e5e5e5}
.info-row:last-child{border-bottom:none}
.info-row .label{color:#666}
.info-row .val{font-weight:600;color:#1a1916}
.info-row .mono{font-family:'Courier New',monospace;font-size:11px}
.info-row .pill{background:${color}15;color:${color};padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px}
.final-balance{background:${b.total_amount - b.paid_amount > 0 ? '#fff7ed' : '#f0fdf4'};border:2px solid ${b.total_amount - b.paid_amount > 0 ? '#fb923c' : '#22c55e'};border-radius:8px;padding:14px 18px;text-align:center;margin-bottom:18px}
.final-balance .label{font-size:10px;color:${b.total_amount - b.paid_amount > 0 ? '#b45309' : '#15803d'};text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:4px}
.final-balance .val{font-size:18px;font-family:'Courier New',monospace;font-weight:700;color:${b.total_amount - b.paid_amount > 0 ? '#d97706' : '#15803d'}}
.stamp{text-align:center;margin:20px 0;color:#999;font-size:11px;font-style:italic;padding:12px;border:2px dashed #ddd;border-radius:6px}
.footer{border-top:1px solid #eee;padding:16px 20px;text-align:center;background:#fafaf8}
.footer .name{font-weight:700;color:#1a1916;font-size:12px;margin-bottom:4px}
.footer .contact{font-size:10px;color:#666;line-height:1.6}
.dev-credit{margin-top:10px;font-size:9px;color:#999}
.dev-credit strong{color:${color}}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}.toolbar{display:none !important}}
.toolbar{position:fixed;top:15px;right:15px;display:flex;gap:10px;z-index:100;background:#fff;padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.toolbar button{padding:9px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:Arial}
.btn-print{background:${color};color:#fff}.btn-close{background:#f5f5f5;border:1px solid #ddd;color:#666}
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨 Imprimer / PDF</button>
  <button class="btn-close" onclick="window.close()">✕</button>
</div>
<div class="page">
  <div class="header">
    ${s.logo_url ? `<img src="${s.logo_url}" style="max-height:45px;margin-bottom:6px;filter:brightness(0) invert(1)" alt="Logo"/>` : ''}
    <h1>${company}</h1>
    <div class="tagline">Développé par RS Comptabilité</div>
    <h2>REÇU DE PAIEMENT</h2>
  </div>
  <div class="content">
    <div class="ref-number">
      Référence <strong>#${refNum}</strong>
    </div>

    <div class="big-amount">
      <div class="label">Montant encaissé</div>
      <div class="val">${payment.amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
      <div class="method">${payment.method}</div>
    </div>

    <div class="section">
      <div class="section-title">📋 Détails du paiement</div>
      <div class="info-row"><span class="label">Date & heure</span><span class="val">${new Date(payment.created_at).toLocaleString('fr-DZ')}</span></div>
      <div class="info-row"><span class="label">Méthode</span><span class="pill">${payment.method}</span></div>
      <div class="info-row"><span class="label">Enregistré par</span><span class="val">${enregistrePar}</span></div>
      ${payment.note ? `<div class="info-row"><span class="label">Note</span><span class="val" style="font-size:11px">${payment.note}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">📄 Facture associée</div>
      <div class="info-row"><span class="label">N° Facture</span><span class="val mono" style="color:${color}">${b.invoice_number}</span></div>
      <div class="info-row"><span class="label">Client</span><span class="val">${b.clients?.full_name || '—'}</span></div>
      ${b.clients?.phone ? `<div class="info-row"><span class="label">Téléphone</span><span class="val">${b.clients.phone}</span></div>` : ''}
      <div class="info-row"><span class="label">Total facture TTC</span><span class="val mono">${b.total_amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span></div>
      <div class="info-row"><span class="label">Total encaissé</span><span class="val mono" style="color:#16a34a">${b.paid_amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span></div>
    </div>

    <div class="final-balance">
      <div class="label">${b.total_amount - b.paid_amount > 0 ? 'Solde restant dû' : '✓ Facture entièrement réglée'}</div>
      <div class="val">${(b.total_amount - b.paid_amount).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
    </div>

    <div class="stamp">Ce reçu fait foi du paiement enregistré dans notre système</div>
  </div>
  <div class="footer">
    <div class="name">${company}</div>
    <div class="contact">
      ${s.address || ''}<br>
      ${s.phone ? `📞 ${s.phone}` : ''} ${s.email ? ` · ✉ ${s.email}` : ''}<br>
      ${s.tax_number ? `NIF/RC : ${s.tax_number}` : ''}
    </div>
    <div class="dev-credit">
      Généré le ${new Date().toLocaleString('fr-DZ')}<br>
      Système <strong>${company}</strong> — Développé par <strong>RS Comptabilité</strong>
    </div>
  </div>
</div>
</body></html>`)
  win.document.close()
}

export default function FacturesPage() {
  const [bills, setBills] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('tout')
  const [view, setView] = useState<'list'|'new'|'pay'|'detail'>('list')
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [detailItems, setDetailItems] = useState<any[]>([])
  const [detailPayments, setDetailPayments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>({ client_id:'', note:'', date_due:'', items:[{ product_id:'', qty:1, price:0 }] })
  const [paiForm, setPaiForm] = useState({ amount:'', method:'Virement CPA', note:'' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: b },{ data: c },{ data: p },{ data: s }] = await Promise.all([
      supabase.from('bills').select('*, clients(full_name,email,phone,address,wilaya)').eq('is_archived',false).order('created_at',{ascending:false}),
      supabase.from('clients').select('*').eq('is_archived',false),
      supabase.from('products').select('*').eq('is_available',true).eq('is_archived',false),
      supabase.from('settings').select('*').single()
    ])
    setBills(b||[]); setClients(c||[]); setProducts(p||[]); setSettings(s||{})
    setLoading(false)
  }

  async function addClient(data: any) {
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    const { data: created } = await supabase.from('clients').insert({...data,created_by:user.id}).select().single()
    await fetchAll()
    return created
  }

  async function addProduct(data: any) {
    const { data: created } = await supabase.from('products').insert({ name:data.name, price:parseFloat(data.price), category:data.category, is_available:true }).select().single()
    await fetchAll()
    return created
  }

  const totalHT = form.items.reduce((s:number,i:any) => s+(i.qty*i.price), 0)
  const tvaRate = settings.tva_rate||19
  const tva = totalHT * tvaRate / 100
  const totalTTC = totalHT + tva

  async function saveBill() {
    setError('')
    if (!form.client_id) { setError('Sélectionnez un client'); return }
    if (form.items.length === 0 || form.items.every((i:any) => !i.product_id)) { setError('Ajoutez au moins un produit'); return }
    setSaving(true)
    try {
      const user = JSON.parse(localStorage.getItem('user')||'{}')
      const { data: newBill } = await supabase.from('bills').insert({ client_id:form.client_id, total_amount:totalTTC, created_by:user.id }).select().single()
      if (newBill) {
        const validItems = form.items.filter((i:any) => i.product_id && i.qty > 0)
        if (validItems.length > 0) {
          await supabase.from('bill_items').insert(
            validItems.map((i:any) => ({ bill_id:newBill.id, product_id:i.product_id, quantity:i.qty, unit_price:i.price }))
          )
        }
      }
      setForm({ client_id:'', note:'', date_due:'', items:[{ product_id:'', qty:1, price:0 }] })
      setView('list'); fetchAll()
    } catch (e: any) {
      setError(e.message||'Erreur')
    }
    setSaving(false)
  }

  async function savePai() {
    setError('')
    const amt = parseFloat(paiForm.amount)
    if (!amt||amt<=0) { setError('Montant invalide'); return }
    const rem = selectedBill.total_amount - selectedBill.paid_amount
    if (amt>rem) { setError(`Montant > solde restant (${dzd(rem)})`); return }
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    const { data: newPay } = await supabase.from('payments').insert({ bill_id:selectedBill.id, amount:amt, method:paiForm.method, created_by:user.id }).select().single()
    // Auto-open receipt PDF
    setTimeout(() => {
      if (newPay) generateReceiptPDF({...newPay, created_at:new Date().toISOString()}, {...selectedBill, paid_amount:selectedBill.paid_amount+amt}, settings)
    }, 300)
    setPaiForm({ amount:'', method:'Virement CPA', note:'' })
    setView('list'); setSelectedBill(null); fetchAll(); setSaving(false)
  }

  async function openDetail(bill: any) {
    const [{ data: items },{ data: pays }] = await Promise.all([
      supabase.from('bill_items').select('*, products(name)').eq('bill_id',bill.id),
      supabase.from('payments').select('*').eq('bill_id',bill.id).order('created_at',{ascending:true})
    ])
    setDetailItems(items||[])
    setDetailPayments(pays||[])
    setSelectedBill(bill)
    setView('detail')
  }

  async function exportPDF(bill: any) {
    const [{ data: items },{ data: pays }] = await Promise.all([
      supabase.from('bill_items').select('*, products(name)').eq('bill_id',bill.id),
      supabase.from('payments').select('*').eq('bill_id',bill.id).order('created_at',{ascending:true})
    ])
    generatePDF(bill, items||[], settings, pays||[])
  }

  async function archive(id: string) {
    if (!confirm('Archiver cette facture ?')) return
    await supabase.from('bills').update({is_archived:true}).eq('id',id)
    fetchAll()
  }
async function deleteBill(id: string, invNum: string) {
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT la facture ${invNum} ?\n\nTous les paiements liés seront aussi supprimés.\nCette action est IRRÉVERSIBLE.`)) return
    await supabase.from('payments').delete().eq('bill_id', id)
    await supabase.from('bill_items').delete().eq('bill_id', id)
    await supabase.from('bills').delete().eq('id', id)
    fetchAll()
  }
  function exportExcel() {
    const headers = ['N° Facture','Client','Total TTC','Payé','Solde','Statut','Date']
    const rows = filtered.map(b => [b.invoice_number, b.clients?.full_name, b.total_amount, b.paid_amount, b.total_amount-b.paid_amount, b.status, new Date(b.created_at).toLocaleDateString('fr-DZ')])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factures_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = bills.filter(b => {
    const ms = filter==='tous'||b.status===filter
    const mq = !search || b.invoice_number?.toLowerCase().includes(search.toLowerCase()) || b.clients?.full_name?.toLowerCase().includes(search.toLowerCase())
    const d = new Date(b.created_at)
    const now = new Date()
    const mp = period==='tout' ||
      (period==='jour' && d.toDateString()===now.toDateString()) ||
      (period==='semaine' && (now.getTime()-d.getTime())<7*86400000) ||
      (period==='mois' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear())
    return ms && mq && mp
  })

  const totalCA = filtered.reduce((s,b) => s + (b.total_amount||0), 0)
  const totalPaid = filtered.reduce((s,b) => s + (b.paid_amount||0), 0)
  const totalUnpaid = totalCA - totalPaid

  const selectedClient = clients.find(c=>c.id===form.client_id)

  // ===== DETAIL VIEW =====
  if (view === 'detail' && selectedBill) {
    const itemsTotal = detailItems.reduce((s,i) => s + (i.total||0), 0)
    const itemsTva = itemsTotal * (tvaRate/100)
    return (
      <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
        <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>{setView('list');setSelectedBill(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </button>
            <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
            <div>
              <div style={{color:'#fff',fontSize:14,fontWeight:600,fontFamily:'JetBrains Mono,monospace'}}>{selectedBill.invoice_number}</div>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>{selectedBill.clients?.full_name}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>exportPDF(selectedBill)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Télécharger PDF
            </button>
            {selectedBill.status !== 'payé' && (
              <button style={btnGr} onClick={()=>{setView('pay')}}>Enregistrer un paiement</button>
            )}
          </div>
        </div>

        <div style={{maxWidth:1000,margin:'0 auto',padding:'28px 24px'}}>
          {/* HEADER CARD */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:12,padding:24,marginBottom:16,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Facture</div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:'#2563EB'}}>{selectedBill.invoice_number}</div>
              <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>Émise le {new Date(selectedBill.created_at).toLocaleDateString('fr-DZ',{dateStyle:'long'})}</div>
            </div>
            <StatusBadge s={selectedBill.status}/>
          </div>

          {/* CLIENT + AMOUNTS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Client</div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(37,99,235,0.12)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700}}>
                  {selectedBill.clients?.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:600}}>{selectedBill.clients?.full_name}</div>
                  {selectedBill.clients?.email && <div style={{fontSize:12,color:'#6b6860'}}>{selectedBill.clients.email}</div>}
                </div>
              </div>
              {selectedBill.clients?.phone && <div style={{fontSize:12,color:'#6b6860'}}>☎ {selectedBill.clients.phone}</div>}
              {selectedBill.clients?.wilaya && <div style={{fontSize:12,color:'#6b6860',marginTop:2}}>📍 {selectedBill.clients.wilaya}</div>}
            </div>
            <div style={{background:'linear-gradient(135deg,rgba(37,99,235,0.06),rgba(124,58,237,0.04))',border:'1px solid rgba(37,99,235,0.12)',borderRadius:10,padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#2563EB',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Montants</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'#6b6860'}}>Total TTC</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{dzd(selectedBill.total_amount)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'#6b6860'}}>Encaissé</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#16a34a'}}>{dzd(selectedBill.paid_amount)}</span>
                </div>
                <div style={{height:1,background:'rgba(0,0,0,0.08)',margin:'4px 0'}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700}}>
                  <span>Solde</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',color:selectedBill.total_amount-selectedBill.paid_amount>0?'#d97706':'#16a34a'}}>
                    {dzd(selectedBill.total_amount-selectedBill.paid_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ITEMS */}
          {detailItems.length > 0 && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:13,fontWeight:600}}>Lignes de facturation</div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f8f7f5'}}>
                    <th style={{textAlign:'left',padding:'10px 20px',fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px'}}>Désignation</th>
                    <th style={{textAlign:'right',padding:'10px 12px',fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px'}}>Qté</th>
                    <th style={{textAlign:'right',padding:'10px 12px',fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px'}}>Prix HT</th>
                    <th style={{textAlign:'right',padding:'10px 20px',fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px'}}>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map(i => (
                    <tr key={i.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                      <td style={{padding:'12px 20px',fontSize:13,fontWeight:500}}>{i.products?.name||'—'}</td>
                      <td style={{padding:'12px 12px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{i.quantity}</td>
                      <td style={{padding:'12px 12px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{dzd(i.unit_price)}</td>
                      <td style={{padding:'12px 20px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{dzd(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{padding:'14px 20px',background:'#f8f7f5',display:'flex',justifyContent:'flex-end'}}>
                <div style={{minWidth:240}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6b6860',marginBottom:4}}><span>Sous-total HT</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(itemsTotal)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6b6860',marginBottom:4}}><span>TVA ({tvaRate}%)</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(itemsTva)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,borderTop:'1px solid rgba(0,0,0,0.1)',paddingTop:4,marginTop:4}}><span>TOTAL TTC</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'#2563EB'}}>{dzd(selectedBill.total_amount)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS HISTORY */}
          {detailPayments.length > 0 && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Historique des paiements ({detailPayments.length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {detailPayments.map(p => (
                  <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f8f7f5',borderRadius:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(22,163,74,0.12)',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700}}>✓</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.method}</div>
                        <div style={{fontSize:11,color:'#a8a69e'}}>{new Date(p.created_at).toLocaleString('fr-DZ')}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:'#16a34a'}}>+{dzd(p.amount)}</span>
                      <button style={btnSm} onClick={()=>generateReceiptPDF(p,selectedBill,settings)}>Reçu</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== NEW BILL =====
  if (view === 'new') return (
    <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
      <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button onClick={()=>setView('list')} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Retour
          </button>
          <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
          <div>
            <div style={{color:'#fff',fontSize:14,fontWeight:600}}>Nouvelle facture</div>
            <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>ABOU IYAD — RS Comptabilité</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnG} onClick={()=>setView('list')}>Annuler</button>
          <button style={btnP} onClick={saveBill} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer la facture'}
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',height:'calc(100vh - 56px)'}}>
        <div style={{overflowY:'auto',padding:'28px 32px'}}>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>}

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Client & Dates</div>
            <label style={lbl}>Client <span style={{color:'#dc2626'}}>*</span></label>
            <ClientSelect options={clients} value={form.client_id} onChange={(v:string)=>setForm({...form,client_id:v})} onAdd={addClient}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
              <div><label style={lbl}>Date de facturation</label><input type="date" style={inp} defaultValue={new Date().toISOString().split('T')[0]}/></div>
              <div><label style={lbl}>Date d'échéance</label><input type="date" style={inp} value={form.date_due} onChange={e=>setForm({...form,date_due:e.target.value})}/></div>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Produits & Services</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 70px 100px 100px 36px',gap:8,marginBottom:8}}>
              {['Désignation','Qté','Prix HT','Total','' ].map((h,i)=>(<div key={i} style={{fontSize:10,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</div>))}
            </div>
            {form.items.map((item:any,idx:number)=>(
              <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 70px 100px 100px 36px',gap:8,marginBottom:8,alignItems:'center',background:'#fafaf8',borderRadius:8,padding:10,border:'1px solid rgba(0,0,0,0.05)'}}>
                <ProductSelect products={products} value={item.product_id} onChange={(id:string,price:number)=>{ const items=[...form.items]; items[idx]={...items[idx],product_id:id,price}; setForm({...form,items}) }} onAdd={addProduct}/>
                <input type="number" min="1" style={{...inp,textAlign:'center',padding:'8px 6px'}} value={item.qty} onChange={e=>{ const items=[...form.items]; items[idx].qty=parseInt(e.target.value)||1; setForm({...form,items}) }}/>
                <input type="number" min="0" style={{...inp,padding:'8px 8px'}} value={item.price} onChange={e=>{ const items=[...form.items]; items[idx].price=parseFloat(e.target.value)||0; setForm({...form,items}) }}/>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,textAlign:'right',paddingRight:2}}>{(item.qty*item.price).toLocaleString('fr-DZ',{minimumFractionDigits:0})}</div>
                <button onClick={()=>{if(form.items.length>1)setForm({...form,items:form.items.filter((_:any,i:number)=>i!==idx)})}} style={{width:32,height:32,borderRadius:6,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.15)',color:'#dc2626',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>×</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,items:[...form.items,{product_id:'',qty:1,price:0}]})} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#2563EB',background:'rgba(37,99,235,0.04)',border:'1px dashed rgba(37,99,235,0.25)',borderRadius:8,padding:11,cursor:'pointer',fontFamily:'Outfit,sans-serif',width:'100%',justifyContent:'center',marginTop:4}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter une ligne
            </button>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Note & Conditions</div>
            <textarea style={{...inp,resize:'vertical',minHeight:80}} rows={3} placeholder="Conditions de paiement, note interne..." value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
          </div>
        </div>

        <div style={{background:'#fff',borderLeft:'1px solid rgba(0,0,0,0.07)',display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{padding:'24px 20px',flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:16}}>Récapitulatif</div>
            <div style={{background:'#f8f7f5',borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b6860',marginBottom:8}}><span>Sous-total HT</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(totalHT)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b6860',marginBottom:12}}><span>TVA ({tvaRate}%)</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(tva)}</span></div>
              <div style={{height:1,background:'rgba(0,0,0,0.08)',marginBottom:12}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700}}><span>Total TTC</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'#2563EB'}}>{dzd(totalTTC)}</span></div>
            </div>
            {selectedClient && (
              <div style={{background:'rgba(37,99,235,0.04)',border:'1px solid rgba(37,99,235,0.1)',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#2563EB',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Client</div>
                <div style={{fontSize:13,fontWeight:600}}>{selectedClient.full_name}</div>
                {selectedClient.email && <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{selectedClient.email}</div>}
              </div>
            )}
          </div>
          <div style={{padding:'16px 20px',borderTop:'1px solid rgba(0,0,0,0.07)'}}>
            <button style={{...btnP,width:'100%',justifyContent:'center',padding:12}} onClick={saveBill} disabled={saving}>{saving?'Enregistrement...':'Enregistrer la facture'}</button>
            <div style={{textAlign:'center',marginTop:12,fontSize:10,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ===== PAY =====
  if (view === 'pay' && selectedBill) return (
    <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
      <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button onClick={()=>{setView('list');setSelectedBill(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Retour
          </button>
          <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
          <div><div style={{color:'#fff',fontSize:14,fontWeight:600}}>Enregistrer un paiement</div><div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>{selectedBill.invoice_number} — {selectedBill.clients?.full_name}</div></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnG} onClick={()=>{setView('list');setSelectedBill(null)}}>Annuler</button>
          <button style={btnGr} onClick={savePai} disabled={saving}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            {saving?'Enregistrement...':'Confirmer + Générer reçu'}
          </button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',height:'calc(100vh - 56px)'}}>
        <div style={{overflowY:'auto',padding:'28px 32px'}}>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px',marginBottom:16}}>
            <label style={lbl}>Montant à payer (DZD) *</label>
            <div style={{position:'relative'}}>
              <input type="number" style={{...inp,fontSize:24,fontWeight:700,paddingRight:80,height:60}} placeholder="0,00" value={paiForm.amount} onChange={e=>setPaiForm({...paiForm,amount:e.target.value})}/>
              <div style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',fontSize:15,fontWeight:700,color:'#a8a69e'}}>DZD</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              {[25,50,75,100].map(pct=>{ const rem=selectedBill.total_amount-selectedBill.paid_amount; return (
                <button key={pct} onClick={()=>setPaiForm({...paiForm,amount:String(Math.round(rem*pct/100))})} style={{flex:1,padding:'8px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif',border:'1px solid rgba(37,99,235,0.2)',background:'rgba(37,99,235,0.05)',color:'#2563EB'}}>{pct}%</button>
              )})}
            </div>
          </div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px',marginBottom:16}}>
            <label style={lbl}>Méthode de paiement</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8}}>
              {[{name:'Virement CPA',icon:'🏦'},{name:'Virement BNA',icon:'🏛️'},{name:'BaridiMob',icon:'📱'},{name:'Chèque',icon:'📋'},{name:'Espèces',icon:'💵'},{name:'Autre',icon:'💳'}].map(m=>(
                <button key={m.name} onClick={()=>setPaiForm({...paiForm,method:m.name})} style={{padding:'14px 8px',borderRadius:10,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'Outfit,sans-serif',textAlign:'center',border:`2px solid ${paiForm.method===m.name?'#2563EB':'rgba(0,0,0,0.1)'}`,background:paiForm.method===m.name?'rgba(37,99,235,0.07)':'#fff',color:paiForm.method===m.name?'#2563EB':'#6b6860'}}>
                  <div style={{fontSize:22,marginBottom:6}}>{m.icon}</div>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px'}}>
            <label style={lbl}>Note / Référence</label>
            <textarea style={{...inp,resize:'vertical'}} rows={3} placeholder="Référence virement, numéro chèque..." value={paiForm.note} onChange={e=>setPaiForm({...paiForm,note:e.target.value})}/>
          </div>
        </div>
        <div style={{background:'#fff',borderLeft:'1px solid rgba(0,0,0,0.07)',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'24px 20px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Facture</div>
            <div style={{background:'#f8f7f5',borderRadius:8,padding:14,marginBottom:14}}>
              {[{label:'N° Facture',val:selectedBill.invoice_number,mono:true,color:'#2563EB'},{label:'Client',val:selectedBill.clients?.full_name},{label:'Total TTC',val:dzd(selectedBill.total_amount),mono:true},{label:'Déjà payé',val:dzd(selectedBill.paid_amount),mono:true,color:'#16a34a'}].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<3?'1px solid rgba(0,0,0,0.05)':'none'}}>
                  <span style={{fontSize:12,color:'#6b6860'}}>{r.label}</span>
                  <span style={{fontSize:12,fontWeight:600,color:r.color||'#1a1916',fontFamily:r.mono?'JetBrains Mono,monospace':'inherit'}}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{background:'rgba(217,119,6,0.08)',border:'2px solid rgba(217,119,6,0.2)',borderRadius:10,padding:14,textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#b45309',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Solde restant</div>
              <div style={{fontSize:26,fontWeight:800,color:'#d97706',fontFamily:'JetBrains Mono,monospace'}}>{dzd(selectedBill.total_amount-selectedBill.paid_amount)}</div>
            </div>
            {paiForm.amount && parseFloat(paiForm.amount)>0 && (
              <div style={{background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#15803d',marginBottom:6}}>Après ce paiement</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:'#6b6860'}}>Nouveau solde</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#16a34a'}}>{dzd(Math.max(0,selectedBill.total_amount-selectedBill.paid_amount-parseFloat(paiForm.amount)))}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{padding:'16px 20px',borderTop:'1px solid rgba(0,0,0,0.07)'}}>
            <button style={{...btnGr,width:'100%',justifyContent:'center',padding:12}} onClick={savePai} disabled={saving}>{saving?'Enregistrement...':'Confirmer + Reçu PDF'}</button>
            <div style={{textAlign:'center',marginTop:12,fontSize:10,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ===== LIST =====
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Factures</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{bills.length} facture(s) · Cliquer sur une ligne pour voir le détail</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnG} onClick={exportExcel}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter Excel
          </button>
          <button style={btnP} onClick={()=>setView('new')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvelle facture
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Total factures', val:filtered.length, color:'#1a1916' },
          { label:'CA total', val:dzd(totalCA), color:'#2563EB', mono:true },
          { label:'Encaissé', val:dzd(totalPaid), color:'#16a34a', mono:true },
          { label:'Impayé', val:dzd(totalUnpaid), color:'#d97706', mono:true },
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'Outfit,sans-serif'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:180,maxWidth:280}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}} placeholder="Rechercher facture ou client..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['tous','impayé','partiel','payé'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:filter===f?'#2563EB':'#fff',color:filter===f?'#fff':'#6b6860'}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
        ))}
        <div style={{width:1,height:24,background:'rgba(0,0,0,0.1)'}}/>
        {[{v:'tout',l:'Tout'},{v:'jour',l:"Auj."},{v:'semaine',l:'7 j'},{v:'mois',l:'Mois'}].map(p=>(
          <button key={p.v} onClick={()=>setPeriod(p.v)} style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:period===p.v?'#2563EB':'#fff',color:period===p.v?'#fff':'#6b6860'}}>{p.l}</button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>{['N° Facture','Client','Total TTC','Payé','Solde','Statut','Date','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              : filtered.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Aucune facture</td></tr>
              : filtered.map(b=>{
                const sol=b.total_amount-b.paid_amount
                return (
                  <tr key={b.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)',cursor:'pointer'}} onClick={()=>openDetail(b)}>
                    <td style={{padding:'11px 14px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#2563EB',fontWeight:500}}>{b.invoice_number}</span></td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(37,99,235,0.1)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,flexShrink:0}}>
                          {b.clients?.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                        </div>
                        <span style={{fontSize:13,fontWeight:500}}>{b.clients?.full_name}</span>
                      </div>
                    </td>
                    <td style={{padding:'11px 14px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{dzd(b.total_amount)}</span></td>
                    <td style={{padding:'11px 14px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a'}}>{dzd(b.paid_amount)}</span></td>
                    <td style={{padding:'11px 14px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:sol>0?'#d97706':'#a8a69e'}}>{dzd(sol)}</span></td>
                    <td style={{padding:'11px 14px'}}><StatusBadge s={b.status}/></td>
                    <td style={{padding:'11px 14px',color:'#a8a69e',fontSize:12}}>{new Date(b.created_at).toLocaleDateString('fr-DZ')}</td>
                    <td style={{padding:'11px 14px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:5}}>
                        {b.status!=='payé' && (
                          <button style={{...btnSm,background:'rgba(22,163,74,0.08)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.15)'}} onClick={()=>{setSelectedBill(b);setView('pay')}}>Régler</button>
                        )}
                        <button style={{...btnSm,background:'rgba(37,99,235,0.08)',color:'#2563EB',border:'1px solid rgba(37,99,235,0.15)'}} onClick={()=>exportPDF(b)}>PDF</button>
                        <button style={{...btnSm,background:'rgba(217,119,6,0.08)',color:'#d97706',border:'1px solid rgba(217,119,6,0.15)'}} onClick={()=>archive(b.id)}>Archiver</button>
                        <button style={{...btnSm,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}} onClick={()=>deleteBill(b.id, b.invoice_number)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}