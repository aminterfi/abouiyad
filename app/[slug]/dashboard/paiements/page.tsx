'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }
function dzdS(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnG: React.CSSProperties = { background:'transparent', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif' }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

const METHOD_COLORS: Record<string, string> = {
  'Virement CPA': '#2563EB',
  'Virement BNA': '#7c3aed',
  'BaridiMob': '#16a34a',
  'Chèque': '#d97706',
  'Espèces': '#dc2626',
  'Autre': '#6b6860',
}

function generateReceiptHTML(payment: any, bill: any, settings: any) {
  const s = settings || {}
  const color = s.primary_color || '#2563EB'
  const company = s.company_name || 'RSS'
  const refNum = payment.id?.slice(0, 8).toUpperCase() || 'XXXXXX'
  const solde = (bill?.total_amount || 0) - (bill?.paid_amount || 0)

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${refNum}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,sans-serif}
body{background:#f1f5f9;padding:20px 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{background:#fff;max-width:480px;width:100%;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1)}
.hdr{background:linear-gradient(135deg,${color},${color}dd);color:#fff;padding:30px 24px;text-align:center}
.hdr .logo{width:50px;height:50px;border-radius:10px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;margin-bottom:10px;overflow:hidden}
.hdr .logo img{max-width:100%;max-height:100%;object-fit:contain}
.hdr h1{font-size:18px;margin-bottom:4px;font-weight:700}
.hdr h2{font-size:11px;background:rgba(255,255,255,0.25);display:inline-block;padding:5px 16px;border-radius:20px;margin-top:10px;letter-spacing:1.2px;font-weight:600}
.content{padding:24px}
.ref{text-align:center;margin-bottom:18px;font-size:11px;color:#94a3b8;font-family:'JetBrains Mono',monospace}
.ref strong{color:${color};background:${color}15;padding:4px 12px;border-radius:6px}
.amount-card{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px dashed #16a34a;border-radius:14px;padding:24px;text-align:center;margin-bottom:18px}
.amount-card .lbl{font-size:10px;color:#16a34a;text-transform:uppercase;font-weight:700;margin-bottom:8px;letter-spacing:1.5px}
.amount-card .val{font-size:32px;color:#15803d;font-family:'JetBrains Mono',monospace;font-weight:800;line-height:1.1}
.amount-card .method{margin-top:12px;display:inline-block;background:#fff;color:#16a34a;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #86efac}
.section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:12px}
.row{display:flex;justify-content:space-between;padding:7px 0;font-size:11.5px;border-bottom:1px dashed #e2e8f0}
.row:last-child{border-bottom:none}
.row span:first-child{color:#64748b}
.row strong{color:#0f172a;font-weight:600}
.balance{border:2px solid;border-radius:10px;padding:14px 18px;text-align:center}
.balance.pending{background:#fff7ed;border-color:#fb923c;color:#c2410c}
.balance.done{background:#f0fdf4;border-color:#22c55e;color:#15803d}
.balance .lbl{font-size:9.5px;text-transform:uppercase;font-weight:700;letter-spacing:1.2px;margin-bottom:4px}
.balance .val{font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:800}
.footer{border-top:1px solid #e2e8f0;padding:14px 18px;text-align:center;background:#f8fafc;font-size:10px;color:#64748b}
.footer strong{color:${color}}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}.toolbar{display:none!important}}
.toolbar{position:fixed;top:12px;left:12px;right:12px;display:flex;gap:8px;z-index:1000;background:#fff;padding:10px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.15)}
.toolbar button{flex:1;padding:11px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:'Inter',sans-serif}
.btn-print{background:${color};color:#fff}
.btn-close{background:#f1f5f9;color:#475569;border:1px solid #cbd5e1}
@media (min-width:768px){.toolbar{top:20px;right:20px;left:auto;width:auto}.toolbar button{flex:initial;padding:10px 20px}}
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
  <button class="btn-close" onclick="window.parent.postMessage('closePdfModal','*')">✕ Fermer</button>
</div>
<div class="page">
  <div class="hdr">
    <div class="logo">${s.logo_url ? `<img src="${s.logo_url}"/>` : company.charAt(0)}</div>
    <h1>${company}</h1>
    <h2>REÇU DE PAIEMENT</h2>
  </div>
  <div class="content">
    <div class="ref">Référence <strong>#${refNum}</strong></div>
    <div class="amount-card">
      <div class="lbl">Montant encaissé</div>
      <div class="val">${dzd(payment.amount)}</div>
      <div class="method">${payment.method}</div>
    </div>
    <div class="section">
      <div class="row"><span>Date</span><strong>${new Date(payment.created_at).toLocaleString('fr-DZ')}</strong></div>
      ${bill?.invoice_number ? `<div class="row"><span>N° Facture</span><strong style="color:${color};font-family:'JetBrains Mono',monospace">${bill.invoice_number}</strong></div>` : ''}
      ${bill?.clients?.full_name ? `<div class="row"><span>Client</span><strong>${bill.clients.full_name}</strong></div>` : ''}
      ${bill ? `<div class="row"><span>Total facture</span><strong style="font-family:'JetBrains Mono',monospace">${dzd(bill.total_amount)}</strong></div>` : ''}
      ${bill ? `<div class="row"><span>Total encaissé</span><strong style="color:#16a34a;font-family:'JetBrains Mono',monospace">${dzd(bill.paid_amount)}</strong></div>` : ''}
    </div>
    ${bill ? `
    <div class="balance ${solde > 0 ? 'pending' : 'done'}">
      <div class="lbl">${solde > 0 ? 'Solde restant' : '✓ Facture réglée'}</div>
      <div class="val">${dzd(solde)}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    <strong>${company}</strong><br>
    Propulsé par <strong>RSS</strong> · Développé par <strong>RS Comptabilité</strong><br>
    Tous droits réservés © 2026
  </div>
</div>
</body></html>`
}

export default function PaiementsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('tous')
  const [period, setPeriod] = useState('tout')
  const [pdfModalHtml, setPdfModalHtml] = useState<string | null>(null)

  useEffect(() => {
    fetch()
    function closePdf(e: MessageEvent) {
      if (e.data === 'closePdfModal') setPdfModalHtml(null)
    }
    window.addEventListener('message', closePdf)
    return () => window.removeEventListener('message', closePdf)
  }, [])

  async function fetch() {
    setLoading(true)
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    if (!u.company_id) { setLoading(false); return }

    const [{ data: pays }, { data: s }] = await Promise.all([
      supabase
        .from('payments')
        .select('*, bills(invoice_number, total_amount, paid_amount, status, clients(full_name,phone,address,wilaya)), users:created_by(full_name)')
        .eq('company_id', u.company_id)
        .order('created_at', { ascending: false }),
      supabase.from('settings').select('*').eq('company_id', u.company_id).maybeSingle(),
    ])
    setPayments(pays || [])
    setSettings(s || {})
    setLoading(false)
  }

  function showReceipt(p: any) {
    const html = generateReceiptHTML(p, p.bills, settings)
    setPdfModalHtml(html)
  }

  function exportCSV() {
    const headers = ['Date', 'N° Facture', 'Client', 'Méthode', 'Montant', 'Note']
    const rows = filtered.map(p => [
      new Date(p.created_at).toLocaleDateString('fr-DZ'),
      p.bills?.invoice_number || '',
      p.bills?.clients?.full_name || '',
      p.method,
      p.amount,
      p.notes || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // FILTRAGE
  const filtered = payments.filter(p => {
    const ms = methodFilter === 'tous' || p.method === methodFilter
    const mq = !search ||
      p.bills?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.bills?.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase())
    const d = new Date(p.created_at)
    const now = new Date()
    let mp = true
    if (period === 'jour') mp = d.toDateString() === now.toDateString()
    else if (period === 'semaine') mp = (now.getTime() - d.getTime()) < 7 * 86400000
    else if (period === 'mois') mp = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return ms && mq && mp
  })

  // STATS
  const totalEncaisse = filtered.reduce((s, p) => s + (p.amount || 0), 0)
  const ticketMoyen = filtered.length > 0 ? totalEncaisse / filtered.length : 0
  const today = new Date().toDateString()
  const totalToday = payments
    .filter(p => new Date(p.created_at).toDateString() === today)
    .reduce((s, p) => s + (p.amount || 0), 0)

  // Méthodes uniques pour filtre
  const uniqueMethods = Array.from(new Set(payments.map(p => p.method).filter(Boolean)))

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Paiements</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{payments.length} paiement(s) au total</div>
        </div>
        <button style={btnG} onClick={exportCSV}>📊 Export CSV</button>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12,marginBottom:16}}>
        {[
          { label:'Total encaissé', val:dzd(totalEncaisse), color:'#16a34a', mono:true, sub:`${filtered.length} paiement(s)` },
          { label:"Aujourd'hui", val:dzdS(totalToday), color:'#2563EB', mono:true, sub:'Encaissements du jour' },
          { label:'Ticket moyen', val:dzd(ticketMoyen), color:'#7c3aed', mono:true, sub:'Par paiement' },
          { label:'Méthodes', val:uniqueMethods.length, color:'#d97706', sub:'Différentes utilisées' },
        ].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.val}</div>
            <div style={{fontSize:10,color:'#a8a69e',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:180,maxWidth:300}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        
        <select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)}
          style={{padding:'7px 11px',borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',fontSize:12,background:'#fff',fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
          <option value="tous">Toutes méthodes</option>
          {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {[{v:'tout',l:'Tout'},{v:'jour',l:'Jour'},{v:'semaine',l:'Semaine'},{v:'mois',l:'Mois'}].map(p => (
          <button key={p.v} onClick={()=>setPeriod(p.v)}
            style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:period===p.v?'#2563EB':'#fff',color:period===p.v?'#fff':'#6b6860'}}>
            {p.l}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>{['Date','N° Facture','Client','Méthode','Montant','Encaissé par','Actions'].map(h => (
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>
                  {payments.length === 0 ? 'Aucun paiement enregistré' : 'Aucun résultat avec ces filtres'}
                </td></tr>
              ) : filtered.map(p => {
                const methodColor = METHOD_COLORS[p.method] || '#6b6860'
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860',whiteSpace:'nowrap'}}>
                      <div style={{fontWeight:500,color:'#1a1916'}}>{new Date(p.created_at).toLocaleDateString('fr-DZ')}</div>
                      <div style={{fontSize:10,color:'#a8a69e',marginTop:2}}>{new Date(p.created_at).toLocaleTimeString('fr-DZ',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#2563EB',fontWeight:500}}>
                        {p.bills?.invoice_number || '—'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:13,fontWeight:500}}>
                      {p.bills?.clients?.full_name || '—'}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,background:`${methodColor}15`,color:methodColor,padding:'3px 9px',borderRadius:4,fontWeight:600,whiteSpace:'nowrap'}}>
                        {p.method}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:'#16a34a'}}>
                        +{dzd(p.amount)}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>
                      {p.users?.full_name || '—'}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <button style={{...btnSm,background:'rgba(37,99,235,0.08)',color:'#2563EB',border:'1px solid rgba(37,99,235,0.15)'}} onClick={()=>showReceipt(p)}>
                        📄 Reçu
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PDF */}
      {pdfModalHtml && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',gap:8,padding:10,background:'#1a1916',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontSize:13,fontWeight:600,paddingLeft:8}}>📄 Reçu de paiement</div>
            <button onClick={()=>setPdfModalHtml(null)} style={{padding:'8px 16px',background:'#dc2626',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Fermer</button>
          </div>
          <iframe srcDoc={pdfModalHtml} style={{flex:1,border:'none',background:'#fff'}} title="Reçu"/>
        </div>
      )}
    </div>
  )
}