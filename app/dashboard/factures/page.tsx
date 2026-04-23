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

function getCompanyId() {
  if (typeof window === 'undefined') return null
  return JSON.parse(localStorage.getItem('user')||'{}').company_id
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string,any> = {
    payé: { bg:'rgba(22,163,74,0.1)', color:'#15803d', border:'rgba(22,163,74,0.2)', label:'● Payé' },
    partiel: { bg:'rgba(217,119,6,0.1)', color:'#b45309', border:'rgba(217,119,6,0.2)', label:'◐ Partiel' },
    impayé: { bg:'rgba(220,38,38,0.08)', color:'#dc2626', border:'rgba(220,38,38,0.15)', label:'○ Impayé' },
  }
  const m = map[s]||map.impayé
  return <span style={{background:m.bg,color:m.color,border:`1px solid ${m.border}`,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap'}}>{m.label}</span>
}

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
        style={{background:'#f0eeea',border:`1.5px solid ${open?'#2563EB':'rgba(0,0,0,0.14)'}`,borderRadius:7,padding:'10px 14px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:44}}>
        {selected ? (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(37,99,235,0.12)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>
              {selected.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
            </div>
            <div><div style={{fontSize:13,fontWeight:600}}>{selected.full_name}</div>{selected.email && <div style={{fontSize:11,color:'#a8a69e'}}>{selected.email}</div>}</div>
          </div>
        ) : <span style={{color:'#a8a69e'}}>Rechercher ou créer un client...</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2" style={{transform:open?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid rgba(0,0,0,0.12)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:500,overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
            <input autoFocus style={{background:'#f8f7f5',border:'none',outline:'none',fontSize:13,width:'100%',padding:'7px 10px',borderRadius:6,fontFamily:'Outfit,sans-serif'}} placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            {filtered.length === 0 ? (
              <div style={{padding:16,textAlign:'center',color:'#a8a69e',fontSize:13}}>{q ? `Aucun client "${q}"` : 'Aucun client'}</div>
            ) : filtered.map((o:any)=>(
              <div key={o.id} onClick={()=>{onChange(o.id);setOpen(false);setQ('')}}
                style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:value===o.id?'rgba(37,99,235,0.05)':'#fff',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
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
                style={{width:'100%',padding:'9px',borderRadius:6,border:'1px dashed rgba(37,99,235,0.3)',background:'rgba(37,99,235,0.04)',color:'#2563EB',fontSize:13,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
                + Créer "{q||'nouveau client'}"
              </button>
            ) : (
              <div style={{background:'rgba(37,99,235,0.04)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:8,padding:12}}>
                <input autoFocus style={{...inp,marginBottom:6,background:'#fff'}} placeholder="Nom complet *" value={newC.full_name} onChange={e=>setNewC({...newC,full_name:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                  <input style={{...inp,background:'#fff'}} placeholder="Email" value={newC.email} onChange={e=>setNewC({...newC,email:e.target.value})}/>
                  <input style={{...inp,background:'#fff'}} placeholder="Téléphone" value={newC.phone} onChange={e=>setNewC({...newC,phone:e.target.value})}/>
                </div>
                <input style={{...inp,marginBottom:8,background:'#fff'}} placeholder="Wilaya" value={newC.wilaya} onChange={e=>setNewC({...newC,wilaya:e.target.value})}/>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setAdding(false)} style={{flex:1,padding:7,borderRadius:5,border:'1px solid rgba(0,0,0,0.12)',background:'#fff',color:'#6b6860',cursor:'pointer',fontSize:12}}>Annuler</button>
                  <button onClick={handleAdd} disabled={saving||!newC.full_name.trim()} style={{flex:1,padding:7,borderRadius:5,border:'none',background:'#2563EB',color:'#fff',cursor:'pointer',fontSize:12}}>{saving?'...':'Créer'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
        {selected ? <span style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.name}</span> : <span style={{color:'#a8a69e'}}>Sélectionner...</span>}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2" style={{marginLeft:4,flexShrink:0,transform:open?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid rgba(0,0,0,0.12)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:500,overflow:'hidden',minWidth:280}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
            <input autoFocus style={{background:'#f8f7f5',border:'none',outline:'none',fontSize:13,width:'100%',padding:'7px 10px',borderRadius:6,fontFamily:'Outfit,sans-serif'}} placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {filtered.length === 0 ? (
              <div style={{padding:14,textAlign:'center',color:'#a8a69e',fontSize:13}}>{q?`Aucun produit "${q}"`:'Aucun produit'}</div>
            ) : filtered.map((p:any)=>(
              <div key={p.id} onClick={()=>{onChange(p.id,p.price);setOpen(false);setQ('')}}
                style={{padding:'10px 14px',cursor:'pointer',background:value===p.id?'rgba(37,99,235,0.05)':'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                  <div style={{fontSize:10,color:'#a8a69e'}}>{p.category}</div>
                </div>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'#16a34a'}}>{dzdShort(p.price)}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid rgba(0,0,0,0.07)',padding:'8px 10px'}}>
            {!adding ? (
              <button onClick={()=>{setAdding(true);setNewP({...newP,name:q})}}
                style={{width:'100%',padding:9,borderRadius:6,border:'1px dashed rgba(37,99,235,0.3)',background:'rgba(37,99,235,0.04)',color:'#2563EB',fontSize:13,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
                + Créer "{q||'nouveau produit'}"
              </button>
            ) : (
              <div style={{background:'rgba(37,99,235,0.04)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:8,padding:12}}>
                <input autoFocus style={{...inp,marginBottom:6,background:'#fff'}} placeholder="Nom *" value={newP.name} onChange={e=>setNewP({...newP,name:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                  <input type="number" style={{...inp,background:'#fff'}} placeholder="Prix HT *" value={newP.price} onChange={e=>setNewP({...newP,price:e.target.value})}/>
                  <select style={{...inp,background:'#fff'}} value={newP.category} onChange={e=>setNewP({...newP,category:e.target.value})}>
                    <option>Service</option><option>Produit</option><option>Abonnement</option>
                  </select>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setAdding(false)} style={{flex:1,padding:7,borderRadius:5,border:'1px solid rgba(0,0,0,0.12)',background:'#fff',color:'#6b6860',cursor:'pointer',fontSize:12}}>Annuler</button>
                  <button onClick={handleAdd} disabled={saving||!newP.name||!newP.price} style={{flex:1,padding:7,borderRadius:5,border:'none',background:'#2563EB',color:'#fff',cursor:'pointer',fontSize:12}}>{saving?'...':'Créer'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

async function generatePDF(bill: any, settings: any) {
  const companyId = getCompanyId()
  const [{ data: items }, { data: pays }, { data: freshSettings }] = await Promise.all([
    supabase.from('bill_items').select('*, products(name, description)').eq('bill_id', bill.id),
    supabase.from('payments').select('*').eq('bill_id', bill.id).order('created_at', { ascending: true }),
    supabase.from('settings').select('*').eq('company_id', companyId).maybeSingle()
  ])
  const s = freshSettings || settings || {}
  const allItems = items || []
  const allPays = pays || []

  const win = window.open('', '_blank', 'width=850,height=950')
  if (!win) { alert('Autorisez les popups'); return }

  const totalHT = allItems.reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const tvaRate = s.tva_rate || 19
  const tva = totalHT * tvaRate / 100
  const color = s.primary_color || '#2563EB'
  const company = s.company_name || 'RSS'

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${bill.invoice_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
body{background:#f5f5f5;padding:20px;color:#1a1916}
.page{background:#fff;max-width:210mm;margin:0 auto;padding:45px;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-radius:4px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid ${color};padding-bottom:22px;margin-bottom:30px}
.company-info h1{font-size:24px;color:${color};margin-bottom:6px;font-weight:700}
.company-info p{font-size:11px;color:#555;line-height:1.6}
.doc-info{text-align:right;min-width:220px}
.doc-info h2{font-size:32px;color:#1a1916;margin-bottom:8px;letter-spacing:2px;font-weight:700}
.doc-info .num{font-family:monospace;color:${color};font-weight:700;font-size:15px;background:${color}15;padding:6px 12px;border-radius:6px;display:inline-block;margin-bottom:6px}
.client-section{background:#fafaf8;border-left:4px solid ${color};padding:18px 22px;border-radius:6px;margin-bottom:26px}
.client-section .label{font-size:10px;color:${color};text-transform:uppercase;font-weight:700;margin-bottom:8px}
.client-section .name{font-size:16px;font-weight:700;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:6px;overflow:hidden}
thead th{background:${color};color:#fff;padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:600}
thead th.right{text-align:right}
tbody td{padding:12px 14px;border-bottom:1px solid #eee;font-size:12px}
tbody td.right{text-align:right;font-family:monospace;font-weight:600}
.totals-box{min-width:300px;background:#fafaf8;border-radius:8px;overflow:hidden;margin-left:auto;margin-bottom:30px}
.totals-box .row{display:flex;justify-content:space-between;padding:10px 18px;font-size:13px}
.totals-box .row.total{background:${color};color:#fff;font-weight:700;font-size:16px;padding:14px 18px}
.totals-box .mono{font-family:monospace}
.footer{border-top:2px solid ${color};padding-top:18px;margin-top:40px;font-size:10px;color:#777;text-align:center}
.footer strong{color:${color}}
@media print {body{background:#fff;padding:0}.page{box-shadow:none}.no-print{display:none !important}}
.toolbar{position:fixed;top:15px;right:15px;display:flex;gap:10px;z-index:100;background:#fff;padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.toolbar button{padding:9px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600}
.btn-print{background:${color};color:#fff}.btn-close{background:#f5f5f5;color:#666;border:1px solid #ddd}
</style></head><body>
<div class="toolbar no-print">
  <button class="btn-print" onclick="window.print()">🖨 Imprimer</button>
  <button class="btn-close" onclick="window.close()">✕</button>
</div>
<div class="page">
  <div class="header">
    <div class="company-info">
      ${s.logo_url ? `<img src="${s.logo_url}" style="max-height:60px;margin-bottom:8px"/>` : ''}
      <h1>${company}</h1>
      <p>
        ${s.address ? `${s.address}<br>` : ''}
        ${s.phone ? `📞 ${s.phone}` : ''} ${s.email ? `· ✉ ${s.email}` : ''}<br>
        ${s.tax_number ? `NIF/RC : ${s.tax_number}` : ''}
      </p>
    </div>
    <div class="doc-info">
      <h2>FACTURE</h2>
      <div class="num">${bill.invoice_number}</div>
      <div style="font-size:11px;color:#666;margin-top:8px">Émise le ${new Date(bill.created_at).toLocaleDateString('fr-DZ')}</div>
    </div>
  </div>
  <div class="client-section">
    <div class="label">Facturé à</div>
    <div class="name">${bill.clients?.full_name || ''}</div>
    ${bill.clients?.phone ? `<div>☎ ${bill.clients.phone}</div>` : ''}
    ${bill.clients?.address ? `<div>📍 ${bill.clients.address}${bill.clients.wilaya ? `, ${bill.clients.wilaya}` : ''}</div>` : ''}
  </div>
  <table>
    <thead><tr><th style="width:50%">Désignation</th><th class="right">Qté</th><th class="right">Prix HT</th><th class="right">Total HT</th></tr></thead>
    <tbody>
      ${allItems.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:#999;padding:30px">Facture globale</td></tr>` : allItems.map((i: any) => `
        <tr>
          <td><strong>${i.products?.name || 'Article'}</strong></td>
          <td class="right">${i.quantity}</td>
          <td class="right">${i.unit_price.toLocaleString('fr-DZ')} DZD</td>
          <td class="right">${i.total.toLocaleString('fr-DZ')} DZD</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals-box">
    ${allItems.length > 0 ? `
      <div class="row"><span>Sous-total HT</span><span class="mono">${totalHT.toLocaleString('fr-DZ')} DZD</span></div>
      <div class="row"><span>TVA (${tvaRate}%)</span><span class="mono">${tva.toLocaleString('fr-DZ')} DZD</span></div>
    ` : ''}
    <div class="row total"><span>TOTAL TTC</span><span class="mono">${bill.total_amount.toLocaleString('fr-DZ')} DZD</span></div>
    ${bill.paid_amount > 0 ? `<div class="row" style="background:#f0fdf4;color:#15803d"><span>Payé</span><span class="mono">${bill.paid_amount.toLocaleString('fr-DZ')} DZD</span></div>` : ''}
    ${bill.total_amount - bill.paid_amount > 0 ? `<div class="row" style="background:#fff7ed;color:#d97706"><span>Solde restant</span><span class="mono">${(bill.total_amount - bill.paid_amount).toLocaleString('fr-DZ')} DZD</span></div>` : ''}
  </div>
  <div class="footer">
    ${s.footer_text || 'Merci de votre confiance.'}<br><br>
    <strong>${company}</strong> — Propulsé par <strong>RSS</strong> · Développé par <strong>RS Comptabilité</strong><br>
    <span style="font-size:9px">Tous droits réservés © 2026</span>
  </div>
</div>
</body></html>`)
  win.document.close()
}

async function generateReceiptPDF(payment: any, bill: any, settings: any) {
  const companyId = getCompanyId()
  const [{ data: freshBill }, { data: freshSettings }] = await Promise.all([
    supabase.from('bills').select('*, clients(full_name,phone,address,wilaya)').eq('id', bill.id).single(),
    supabase.from('settings').select('*').eq('company_id', companyId).maybeSingle(),
  ])
  const s = freshSettings || settings || {}
  const b = freshBill || bill

  const win = window.open('', '_blank', 'width=750,height=900')
  if (!win) { alert('Autorisez les popups'); return }
  const color = s.primary_color || '#2563EB'
  const company = s.company_name || 'RSS'
  const refNum = payment.id?.slice(0, 8).toUpperCase() || 'XXXXXX'

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reçu ${refNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
body{background:#f5f5f5;padding:20px}
.page{background:#fff;max-width:160mm;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.header{background:linear-gradient(135deg,${color},${color}dd);color:#fff;padding:30px;text-align:center}
.header h1{font-size:22px;margin-bottom:6px}
.header h2{font-size:14px;background:rgba(255,255,255,0.2);display:inline-block;padding:6px 20px;border-radius:20px;margin-top:14px}
.content{padding:30px}
.big-amount{background:#f0fdf4;border:3px dashed #16a34a;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px}
.big-amount .label{font-size:11px;color:#16a34a;text-transform:uppercase;font-weight:700;margin-bottom:8px}
.big-amount .val{font-size:36px;color:#15803d;font-family:monospace;font-weight:700}
.section{background:#fafaf8;border-radius:8px;padding:16px 20px;margin-bottom:14px}
.info-row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px;border-bottom:1px dashed #e5e5e5}
.info-row:last-child{border-bottom:none}
.footer{border-top:1px solid #eee;padding:16px 20px;text-align:center;background:#fafaf8;font-size:11px;color:#666}
.footer strong{color:${color}}
@media print{body{background:#fff;padding:0}.page{box-shadow:none}.toolbar{display:none!important}}
.toolbar{position:fixed;top:15px;right:15px;display:flex;gap:10px;z-index:100;background:#fff;padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.toolbar button{padding:9px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600}
.btn-print{background:${color};color:#fff}.btn-close{background:#f5f5f5;border:1px solid #ddd;color:#666}
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨 Imprimer</button>
  <button class="btn-close" onclick="window.close()">✕</button>
</div>
<div class="page">
  <div class="header">
    ${s.logo_url ? `<img src="${s.logo_url}" style="max-height:45px;margin-bottom:6px;filter:brightness(0) invert(1)"/>` : ''}
    <h1>${company}</h1>
    <h2>REÇU DE PAIEMENT</h2>
  </div>
  <div class="content">
    <div style="text-align:center;margin-bottom:20px;color:#999;font-size:11px;font-family:monospace">
      Référence <strong style="color:${color};background:${color}15;padding:4px 12px;border-radius:6px">#${refNum}</strong>
    </div>
    <div class="big-amount">
      <div class="label">Montant encaissé</div>
      <div class="val">${payment.amount.toLocaleString('fr-DZ')} DZD</div>
      <div style="margin-top:10px;display:inline-block;background:#fff;color:#16a34a;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #86efac">${payment.method}</div>
    </div>
    <div class="section">
      <div class="info-row"><span>Date</span><strong>${new Date(payment.created_at).toLocaleString('fr-DZ')}</strong></div>
      <div class="info-row"><span>N° Facture</span><strong style="color:${color};font-family:monospace">${b.invoice_number}</strong></div>
      <div class="info-row"><span>Client</span><strong>${b.clients?.full_name || '—'}</strong></div>
      <div class="info-row"><span>Total facture</span><strong style="font-family:monospace">${b.total_amount.toLocaleString('fr-DZ')} DZD</strong></div>
      <div class="info-row"><span>Total encaissé</span><strong style="color:#16a34a;font-family:monospace">${b.paid_amount.toLocaleString('fr-DZ')} DZD</strong></div>
    </div>
    <div style="background:${b.total_amount - b.paid_amount > 0 ? '#fff7ed' : '#f0fdf4'};border:2px solid ${b.total_amount - b.paid_amount > 0 ? '#fb923c' : '#22c55e'};border-radius:8px;padding:14px 18px;text-align:center">
      <div style="font-size:10px;color:${b.total_amount - b.paid_amount > 0 ? '#b45309' : '#15803d'};text-transform:uppercase;font-weight:700;margin-bottom:4px">${b.total_amount - b.paid_amount > 0 ? 'Solde restant' : '✓ Facture réglée'}</div>
      <div style="font-size:18px;font-family:monospace;font-weight:700;color:${b.total_amount - b.paid_amount > 0 ? '#d97706' : '#15803d'}">${(b.total_amount - b.paid_amount).toLocaleString('fr-DZ')} DZD</div>
    </div>
  </div>
  <div class="footer">
    <strong>${company}</strong><br>
    Propulsé par <strong>RSS</strong> · Développé par <strong>RS Comptabilité</strong><br>
    <span style="font-size:9px">Tous droits réservés © 2026</span>
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
    const companyId = getCompanyId()
    if (!companyId) { setLoading(false); return }
    const [{ data: b },{ data: c },{ data: p },{ data: s }] = await Promise.all([
      supabase.from('bills').select('*, clients(full_name,email,phone,address,wilaya)').eq('company_id', companyId).eq('is_archived',false).order('created_at',{ascending:false}),
      supabase.from('clients').select('*').eq('company_id', companyId).eq('is_archived',false),
      supabase.from('products').select('*').eq('company_id', companyId).eq('is_available',true).eq('is_archived',false),
      supabase.from('settings').select('*').eq('company_id', companyId).maybeSingle()
    ])
    setBills(b||[]); setClients(c||[]); setProducts(p||[]); setSettings(s||{})
    setLoading(false)
  }

  async function addClient(data: any) {
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    const { data: created } = await supabase.from('clients').insert({...data, created_by:user.id, company_id:user.company_id}).select().single()
    await fetchAll()
    return created
  }

  async function addProduct(data: any) {
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    const { data: created } = await supabase.from('products').insert({ name:data.name, price:parseFloat(data.price), category:data.category, is_available:true, company_id:user.company_id }).select().single()
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
      if (!user.company_id) { setError('Company ID manquant'); setSaving(false); return }
      
      const { data: newBill, error: billErr } = await supabase.from('bills').insert({
        client_id: form.client_id,
        total_amount: totalTTC,
        created_by: user.id,
        company_id: user.company_id,
        notes: form.note,
        due_date: form.date_due || null
      }).select().single()
      
      if (billErr) throw billErr
      
      if (newBill) {
        const validItems = form.items.filter((i:any) => i.product_id && i.qty > 0)
        if (validItems.length > 0) {
          await supabase.from('bill_items').insert(
            validItems.map((i:any) => ({
              bill_id: newBill.id,
              product_id: i.product_id,
              quantity: i.qty,
              unit_price: i.price,
              company_id: user.company_id
            }))
          )
        }
      }
      
      setForm({ client_id:'', note:'', date_due:'', items:[{ product_id:'', qty:1, price:0 }] })
      setView('list')
      fetchAll()
    } catch (e: any) {
      setError(e.message || 'Erreur')
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
    const { data: newPay } = await supabase.from('payments').insert({
      bill_id: selectedBill.id,
      amount: amt,
      method: paiForm.method,
      notes: paiForm.note,
      created_by: user.id,
      company_id: user.company_id
    }).select().single()
    
    setTimeout(() => {
      if (newPay) generateReceiptPDF({...newPay, created_at:new Date().toISOString()}, {...selectedBill, paid_amount:selectedBill.paid_amount+amt}, settings)
    }, 300)
    setPaiForm({ amount:'', method:'Virement CPA', note:'' })
    setView('list'); setSelectedBill(null); fetchAll()
    setSaving(false)
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

  async function archive(id: string) {
    if (!confirm('Archiver cette facture ?')) return
    await supabase.from('bills').update({is_archived:true}).eq('id',id)
    fetchAll()
  }

  async function deleteBill(id: string, invNum: string) {
    if (!confirm(`⚠️ SUPPRIMER la facture ${invNum} ?\n\nIrréversible.`)) return
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

  // ===== DETAIL VIEW =====
  if (view === 'detail' && selectedBill) {
    return (
      <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0}}>
        <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>{setView('list');setSelectedBill(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontSize:13}}>← Retour</button>
            <div><div style={{color:'#fff',fontSize:14,fontWeight:600}}>{selectedBill.invoice_number}</div></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>generatePDF(selectedBill, settings)}>📄 PDF</button>
            {selectedBill.status !== 'payé' && <button style={btnGr} onClick={()=>setView('pay')}>Encaisser</button>}
          </div>
        </div>

        <div style={{maxWidth:1000,margin:'0 auto',padding:'28px 24px'}}>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:12,padding:24,marginBottom:16,display:'flex',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:'#2563EB'}}>{selectedBill.invoice_number}</div>
              <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>Émise le {new Date(selectedBill.created_at).toLocaleDateString('fr-DZ')}</div>
            </div>
            <StatusBadge s={selectedBill.status}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',marginBottom:10}}>Client</div>
              <div style={{fontSize:15,fontWeight:600}}>{selectedBill.clients?.full_name}</div>
              {selectedBill.clients?.phone && <div style={{fontSize:12,color:'#6b6860',marginTop:4}}>☎ {selectedBill.clients.phone}</div>}
            </div>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#2563EB',textTransform:'uppercase',marginBottom:10}}>Montants</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Total TTC</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(selectedBill.total_amount)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>Encaissé</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'#16a34a'}}>{dzd(selectedBill.paid_amount)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'1px solid rgba(0,0,0,0.08)',paddingTop:6,marginTop:6}}><span>Solde</span><span style={{fontFamily:'JetBrains Mono,monospace',color:selectedBill.total_amount-selectedBill.paid_amount>0?'#d97706':'#16a34a'}}>{dzd(selectedBill.total_amount-selectedBill.paid_amount)}</span></div>
            </div>
          </div>

          {detailItems.length > 0 && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(0,0,0,0.07)',fontSize:13,fontWeight:600}}>Lignes</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f8f7f5'}}>
                    <th style={{textAlign:'left',padding:'10px 20px',fontSize:11,color:'#a8a69e',textTransform:'uppercase'}}>Désignation</th>
                    <th style={{textAlign:'right',padding:'10px',fontSize:11,color:'#a8a69e',textTransform:'uppercase'}}>Qté</th>
                    <th style={{textAlign:'right',padding:'10px',fontSize:11,color:'#a8a69e',textTransform:'uppercase'}}>Prix</th>
                    <th style={{textAlign:'right',padding:'10px 20px',fontSize:11,color:'#a8a69e',textTransform:'uppercase'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map(i => (
                    <tr key={i.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                      <td style={{padding:'12px 20px',fontSize:13}}>{i.products?.name||'—'}</td>
                      <td style={{padding:'12px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{i.quantity}</td>
                      <td style={{padding:'12px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace'}}>{dzd(i.unit_price)}</td>
                      <td style={{padding:'12px 20px',fontSize:13,textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{dzd(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailPayments.length > 0 && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Paiements ({detailPayments.length})</div>
              {detailPayments.map(p => (
                <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f8f7f5',borderRadius:6,marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{p.method}</div>
                    <div style={{fontSize:11,color:'#a8a69e'}}>{new Date(p.created_at).toLocaleString('fr-DZ')}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:'#16a34a'}}>+{dzd(p.amount)}</span>
                    <button style={btnSm} onClick={()=>generateReceiptPDF(p,selectedBill,settings)}>Reçu</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== NEW BILL =====
  if (view === 'new') return (
    <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0}}>
      <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button onClick={()=>setView('list')} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontSize:13}}>← Retour</button>
          <div style={{color:'#fff',fontSize:14,fontWeight:600}}>Nouvelle facture</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnG} onClick={()=>setView('list')}>Annuler</button>
          <button style={btnP} onClick={saveBill} disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',height:'calc(100vh - 56px)'}}>
        <div style={{overflowY:'auto',padding:'28px 32px'}}>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>}

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',marginBottom:14}}>Client & Dates</div>
            <label style={lbl}>Client <span style={{color:'#dc2626'}}>*</span></label>
            <ClientSelect options={clients} value={form.client_id} onChange={(v:string)=>setForm({...form,client_id:v})} onAdd={addClient}/>
            <div style={{marginTop:14}}>
              <label style={lbl}>Date d'échéance</label>
              <input type="date" style={inp} value={form.date_due} onChange={e=>setForm({...form,date_due:e.target.value})}/>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',marginBottom:14}}>Produits & Services</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 70px 100px 100px 36px',gap:8,marginBottom:8}}>
              {['Désignation','Qté','Prix','Total',''].map((h,i)=>(<div key={i} style={{fontSize:10,fontWeight:700,color:'#a8a69e',textTransform:'uppercase'}}>{h}</div>))}
            </div>
            {form.items.map((item:any,idx:number)=>(
              <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 70px 100px 100px 36px',gap:8,marginBottom:8,alignItems:'center',background:'#fafaf8',borderRadius:8,padding:10}}>
                <ProductSelect products={products} value={item.product_id} onChange={(id:string,price:number)=>{ const items=[...form.items]; items[idx]={...items[idx],product_id:id,price}; setForm({...form,items}) }} onAdd={addProduct}/>
                <input type="number" min="1" style={{...inp,textAlign:'center',padding:'8px 6px'}} value={item.qty} onChange={e=>{ const items=[...form.items]; items[idx].qty=parseInt(e.target.value)||1; setForm({...form,items}) }}/>
                <input type="number" min="0" style={{...inp,padding:'8px'}} value={item.price} onChange={e=>{ const items=[...form.items]; items[idx].price=parseFloat(e.target.value)||0; setForm({...form,items}) }}/>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,textAlign:'right'}}>{(item.qty*item.price).toLocaleString('fr-DZ')}</div>
                <button onClick={()=>{if(form.items.length>1)setForm({...form,items:form.items.filter((_:any,i:number)=>i!==idx)})}} style={{width:32,height:32,borderRadius:6,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.15)',color:'#dc2626',cursor:'pointer',fontSize:18}}>×</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,items:[...form.items,{product_id:'',qty:1,price:0}]})} style={{width:'100%',padding:11,fontSize:13,color:'#2563EB',background:'rgba(37,99,235,0.04)',border:'1px dashed rgba(37,99,235,0.25)',borderRadius:8,cursor:'pointer',marginTop:4}}>
              + Ajouter une ligne
            </button>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px'}}>
            <label style={lbl}>Note</label>
            <textarea style={{...inp,minHeight:80}} rows={3} placeholder="Note..." value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
          </div>
        </div>

        <div style={{background:'#fff',borderLeft:'1px solid rgba(0,0,0,0.07)',padding:'24px 20px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',marginBottom:16}}>Total</div>
          <div style={{background:'#f8f7f5',borderRadius:10,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}><span>Sous-total HT</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(totalHT)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:12}}><span>TVA ({tvaRate}%)</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{dzd(tva)}</span></div>
            <div style={{height:1,background:'rgba(0,0,0,0.08)',marginBottom:12}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700}}><span>Total TTC</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'#2563EB'}}>{dzd(totalTTC)}</span></div>
          </div>
          <button style={{...btnP,width:'100%',justifyContent:'center',padding:12,marginTop:16}} onClick={saveBill} disabled={saving}>{saving?'...':'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )

  // ===== PAY =====
  if (view === 'pay' && selectedBill) return (
    <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0}}>
      <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button onClick={()=>{setView('list');setSelectedBill(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontSize:13}}>← Retour</button>
          <div style={{color:'#fff',fontSize:14,fontWeight:600}}>Encaisser {selectedBill.invoice_number}</div>
        </div>
        <button style={btnGr} onClick={savePai} disabled={saving}>{saving?'...':'Confirmer + Reçu'}</button>
      </div>
      <div style={{maxWidth:700,margin:'0 auto',padding:'32px 24px'}}>
        {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>}

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px',marginBottom:16}}>
          <label style={lbl}>Montant (DZD) *</label>
          <input type="number" style={{...inp,fontSize:24,fontWeight:700,height:60}} placeholder="0" value={paiForm.amount} onChange={e=>setPaiForm({...paiForm,amount:e.target.value})}/>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            {[25,50,75,100].map(pct=>{ const rem=selectedBill.total_amount-selectedBill.paid_amount; return (
              <button key={pct} onClick={()=>setPaiForm({...paiForm,amount:String(Math.round(rem*pct/100))})} style={{flex:1,padding:'8px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid rgba(37,99,235,0.2)',background:'rgba(37,99,235,0.05)',color:'#2563EB'}}>{pct}%</button>
            )})}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
          <label style={lbl}>Méthode</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8}}>
            {['Virement CPA','Virement BNA','BaridiMob','Chèque','Espèces','Autre'].map(m=>(
              <button key={m} onClick={()=>setPaiForm({...paiForm,method:m})} style={{padding:'12px',borderRadius:8,fontSize:12,cursor:'pointer',border:`2px solid ${paiForm.method===m?'#2563EB':'rgba(0,0,0,0.1)'}`,background:paiForm.method===m?'rgba(37,99,235,0.07)':'#fff',color:paiForm.method===m?'#2563EB':'#6b6860'}}>{m}</button>
            ))}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
          <label style={lbl}>Note</label>
          <textarea style={{...inp,minHeight:60}} value={paiForm.note} onChange={e=>setPaiForm({...paiForm,note:e.target.value})}/>
        </div>

        <div style={{background:'rgba(217,119,6,0.08)',border:'2px solid rgba(217,119,6,0.2)',borderRadius:10,padding:14,textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#b45309',textTransform:'uppercase',marginBottom:6}}>Solde restant</div>
          <div style={{fontSize:26,fontWeight:800,color:'#d97706',fontFamily:'JetBrains Mono,monospace'}}>{dzd(selectedBill.total_amount-selectedBill.paid_amount)}</div>
        </div>
      </div>
    </div>
  )

  // ===== LIST =====
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Factures</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{bills.length} facture(s)</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={btnG} onClick={exportExcel}>📊 Export</button>
          <button style={btnP} onClick={()=>setView('new')}>+ Nouvelle facture</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Factures', val:filtered.length, color:'#1a1916' },
          { label:'CA total', val:dzd(totalCA), color:'#2563EB', mono:true },
          { label:'Encaissé', val:dzd(totalPaid), color:'#16a34a', mono:true },
          { label:'Impayé', val:dzd(totalUnpaid), color:'#d97706', mono:true },
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input style={{padding:'7px 11px',borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',fontSize:13,flex:1,minWidth:180,maxWidth:300,fontFamily:'Outfit,sans-serif'}} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {['tous','impayé','partiel','payé'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:filter===f?'#2563EB':'#fff',color:filter===f?'#fff':'#6b6860'}}>{f}</button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>{['N° Facture','Client','Total','Payé','Solde','Statut','Date','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',background:'#f0eeea'}}>{h}</th>
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
                    <td style={{padding:'11px 14px',fontSize:13,fontWeight:500}}>{b.clients?.full_name}</td>
                    <td style={{padding:'11px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{dzd(b.total_amount)}</td>
                    <td style={{padding:'11px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a'}}>{dzd(b.paid_amount)}</td>
                    <td style={{padding:'11px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:sol>0?'#d97706':'#a8a69e'}}>{dzd(sol)}</td>
                    <td style={{padding:'11px 14px'}}><StatusBadge s={b.status}/></td>
                    <td style={{padding:'11px 14px',color:'#a8a69e',fontSize:12}}>{new Date(b.created_at).toLocaleDateString('fr-DZ')}</td>
                    <td style={{padding:'11px 14px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:5}}>
                        {b.status!=='payé' && <button style={{...btnSm,background:'rgba(22,163,74,0.08)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.15)'}} onClick={()=>{setSelectedBill(b);setView('pay')}}>Régler</button>}
                        <button style={{...btnSm,background:'rgba(37,99,235,0.08)',color:'#2563EB',border:'1px solid rgba(37,99,235,0.15)'}} onClick={()=>generatePDF(b, settings)}>PDF</button>
                        <button style={{...btnSm,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}} onClick={()=>deleteBill(b.id, b.invoice_number)}>×</button>
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