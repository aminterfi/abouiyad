'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'

type PurchaseMode = 'simple' | 'import'

type PurchaseLine = {
  productId: string
  quantity: string
  unitCost: string
  lotCode: string
  notes: string
}

type ExtraCostLine = {
  name: string
  amount: string
}

type ExtractionLine = {
  raw_name: string
  matched_product_id: string | null
  matched_product_name: string | null
  quantity: number
  unit_cost: number
  lot_code: string | null
  notes: string | null
  confidence: number
}

type ExtractionCost = {
  name: string
  amount: number
}

type ExtractionPayload = {
  supplierName: string
  referenceNumber: string | null
  purchaseDate: string | null
  currency: string
  purchaseType: PurchaseMode
  notes: string | null
  confidenceSummary: string
  warnings: string[]
  extraCosts: ExtractionCost[]
  items: ExtractionLine[]
}

function formatMoney(value: number, currency: string) {
  return (value || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) + ' ' + currency
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function parseInputAmount(value: string) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const inp: React.CSSProperties = {
  width: '100%',
  background: '#f0eeea',
  border: '1px solid rgba(0,0,0,0.14)',
  borderRadius: 6,
  padding: '9px 12px',
  fontSize: 13,
  color: '#1a1916',
  fontFamily: 'Outfit,sans-serif',
  outline: 'none',
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#6b6860',
  marginBottom: 5,
}

const SEGMENTS: Array<{ key: PurchaseMode; label: string; note: string }> = [
  { key: 'simple', label: 'Bon d achat simple', note: 'Reception classique. Le prix d achat du lot est celui de la ligne.' },
  { key: 'import', label: 'Bon d achat importation', note: 'Les autres frais sont repartis sur les lignes au prorata des quantites achetees.' },
]

const CURRENCIES = ['DZD', 'EUR', 'USD', 'CNY', 'GBP', 'MAD', 'TND']

function createEmptyLine(): PurchaseLine {
  return {
    productId: '',
    quantity: '1',
    unitCost: '',
    lotCode: '',
    notes: '',
  }
}

function createEmptyExtraCost(): ExtraCostLine {
  return {
    name: '',
    amount: '',
  }
}

export default function StockAchatsPage() {
  const { slug } = useParams() as { slug: string }
  const aiFileInputRef = useRef<HTMLInputElement | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiFileName, setAiFileName] = useState('')
  const [mode, setMode] = useState<PurchaseMode>('simple')
  const [supplierName, setSupplierName] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState('DZD')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLine[]>([createEmptyLine()])
  const [extraCosts, setExtraCosts] = useState<ExtraCostLine[]>([createEmptyExtraCost()])

  useEffect(() => { load() }, [])
  useRealtime(['products', 'purchase_documents', 'purchase_document_items', 'stock_movements', 'stock_lots'], load, { intervalMs: 4000 })

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) {
      setLoading(false)
      return
    }

    const [{ data: productRows }, { data: purchaseRows }] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,unit,is_stockable,track_stock')
        .eq('company_id', user.company_id)
        .eq('is_archived', false)
        .eq('is_stockable', true)
        .eq('track_stock', true)
        .order('name'),
      supabase
        .from('purchase_documents')
        .select('id,supplier_name,document_kind,reference_number,purchase_date,currency,subtotal,extra_costs_total,grand_total,created_at')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setProducts(productRows || [])
    setPurchases(purchaseRows || [])
    setLoading(false)
  }

  const linePreview = useMemo(() => {
    const parsed = lines.map((line) => {
      const quantity = parseInputAmount(line.quantity)
      const unitCost = parseInputAmount(line.unitCost)
      const baseTotal = roundMoney(quantity * unitCost)
      return { ...line, quantity, unitCost, baseTotal }
    })

    const subtotal = roundMoney(parsed.reduce((sum, line) => sum + line.baseTotal, 0))
    const totalQuantity = parsed.reduce((sum, line) => sum + line.quantity, 0)
    const normalizedCosts = mode === 'import'
      ? extraCosts
        .map((cost) => ({
          name: cost.name.trim(),
          amount: roundMoney(Number(cost.amount || 0)),
        }))
        .filter((cost) => cost.name && cost.amount > 0)
      : []
    const extra = roundMoney(normalizedCosts.reduce((sum, cost) => sum + cost.amount, 0))
    const preview = parsed.map((line) => {
      const extraAllocated = totalQuantity > 0 && extra > 0
        ? roundMoney(extra * (line.quantity / totalQuantity))
        : 0
      const effectiveUnitCost = line.quantity > 0
        ? roundMoney((line.baseTotal + extraAllocated) / line.quantity)
        : roundMoney(line.unitCost)
      return { ...line, extraAllocated, effectiveUnitCost }
    })

    if (preview.length > 1 && extra > 0) {
      const allocated = roundMoney(preview.reduce((sum, line) => sum + line.extraAllocated, 0))
      const gap = roundMoney(extra - allocated)
      if (gap !== 0) {
        const last = preview[preview.length - 1]
        last.extraAllocated = roundMoney(last.extraAllocated + gap)
        last.effectiveUnitCost = last.quantity > 0
          ? roundMoney((last.baseTotal + last.extraAllocated) / last.quantity)
          : last.effectiveUnitCost
      }
    }

    return {
      lines: preview,
      subtotal,
      extra,
      normalizedCosts,
      grandTotal: roundMoney(subtotal + extra),
    }
  }, [extraCosts, lines, mode])

  function updateLine(index: number, patch: Partial<PurchaseLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine()])
  }

  function removeLine(index: number) {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))
  }

  function updateExtraCost(index: number, patch: Partial<ExtraCostLine>) {
    setExtraCosts((current) => current.map((cost, costIndex) => costIndex === index ? { ...cost, ...patch } : cost))
  }

  function addExtraCost() {
    setExtraCosts((current) => [...current, createEmptyExtraCost()])
  }

  function removeExtraCost(index: number) {
    setExtraCosts((current) => current.length === 1 ? current : current.filter((_, costIndex) => costIndex !== index))
  }

  function clearAiFeedback() {
    setAiWarnings([])
    setAiSummary('')
    setAiFileName('')
  }

  function applyExtraction(extraction: ExtractionPayload) {
    const nextMode: PurchaseMode = extraction.purchaseType === 'import' || extraction.extraCosts.length > 0 ? 'import' : 'simple'
    setMode(nextMode)
    setSupplierName(extraction.supplierName || '')
    setReferenceNumber(extraction.referenceNumber || '')
    setPurchaseDate(extraction.purchaseDate || new Date().toISOString().slice(0, 10))
    setCurrency(CURRENCIES.includes(extraction.currency) ? extraction.currency : 'DZD')
    setNotes(extraction.notes || '')
    setExtraCosts(
      nextMode === 'import'
        ? (extraction.extraCosts.length > 0
          ? extraction.extraCosts.map((cost) => ({
              name: cost.name,
              amount: String(cost.amount || ''),
            }))
          : [createEmptyExtraCost()])
        : [createEmptyExtraCost()],
    )
    setLines(
      extraction.items.length > 0
        ? extraction.items.map((item) => ({
            productId: item.matched_product_id || '',
            quantity: item.quantity > 0 ? String(item.quantity) : '1',
            unitCost: item.unit_cost >= 0 ? String(item.unit_cost) : '',
            lotCode: item.lot_code || '',
            notes: [
              item.raw_name && item.matched_product_name !== item.raw_name ? `Lu: ${item.raw_name}` : '',
              item.notes || '',
              !item.matched_product_id ? 'Produit a verifier.' : '',
            ].filter(Boolean).join(' | '),
          }))
        : [createEmptyLine()],
    )
    setAiWarnings(extraction.warnings || [])
    setAiSummary(extraction.confidenceSummary || 'Analyse terminee.')
  }

async function handleAiFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setExtracting(true)
    setError('')
    setMessage('')
    setAiWarnings([])
    setAiSummary('')
    setAiFileName(file.name)

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.company_id) {
        throw new Error('Entreprise introuvable dans la session.')
      }

      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      const accessToken = authData.session?.access_token
      if (!accessToken) {
        throw new Error('Session Supabase introuvable. Reconnectez-vous puis recommencez.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('companyId', user.company_id)
      formData.append('creatorEmail', user.email || '')

      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/achats-extract`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Analyse impossible.')
      }

      applyExtraction(result.extraction as ExtractionPayload)
      setMessage(`Document analyse: ${file.name}. Verifiez les champs avant enregistrement.`)
    } catch (requestError: unknown) {
      const nextError = requestError instanceof Error ? requestError.message : 'Analyse impossible.'
      setError(nextError)
    } finally {
      setExtracting(false)
      event.target.value = ''
    }
  }

  async function submit() {
    setSaving(true)
    setError('')
    setMessage('')

    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const payloadLines = lines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity || 0),
        unitCost: Number(line.unitCost || 0),
        lotCode: line.lotCode || null,
        notes: line.notes || null,
      }))
      .filter((line) => line.productId && line.quantity > 0 && line.unitCost >= 0)

    if (!user.company_id || !supplierName.trim() || payloadLines.length === 0) {
      setError('Ajoutez un fournisseur et au moins une ligne valide.')
      setSaving(false)
      return
    }

    const response = await fetch('/api/stock/operational', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'purchase_receipt',
        companyId: user.company_id,
        createdBy: user.id,
        creatorEmail: user.email,
        purchaseType: mode,
        currency,
        supplierName: supplierName.trim(),
        referenceNumber: referenceNumber.trim() || null,
        purchaseDate,
        extraCosts: mode === 'import'
          ? extraCosts.map((cost) => ({
              name: cost.name,
              amount: Number(cost.amount || 0),
            }))
          : [],
        notes: notes.trim() || null,
        items: payloadLines,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      setError(result?.error || 'Achat impossible.')
      setSaving(false)
      return
    }

    setMessage(mode === 'import'
      ? 'Bon d achat importation enregistre. Les frais ont ete integres dans le cout des lots.'
      : 'Bon d achat simple enregistre.')
    setSupplierName('')
    setReferenceNumber('')
    setCurrency('DZD')
    setNotes('')
    setLines([createEmptyLine()])
    setExtraCosts([createEmptyExtraCost()])
    clearAiFeedback()
    setSaving(false)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Achats & reception stock</div>
          <div style={{ fontSize: 12, color: '#a8a69e', marginTop: 2 }}>Bon d achat simple et bon d achat importation avec integration des frais</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/${slug}/dashboard/stock`} style={{ padding: '9px 16px', fontSize: 12, background: '#fff', color: '#6b6860', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 6, textDecoration: 'none' }}>Retour stock</Link>
          <Link href={`/${slug}/dashboard/stock/mouvements`} style={{ padding: '9px 16px', fontSize: 12, background: '#2563EB', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 500 }}>Voir mouvements</Link>
        </div>
      </div>

      {message && <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#15803d', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{message}</div>}
      {error && <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Lecture IA du bon d achat</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1916', marginBottom: 4 }}>Importer un PDF ou une image pour pre-remplir le formulaire</div>
            <div style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.6 }}>
              L IA lit le document, propose le fournisseur, la devise, les lignes produit et les autres frais. Vous relisez puis vous enregistrez manuellement.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={aiFileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleAiFileChange}
            />
            <button
              type="button"
              onClick={() => aiFileInputRef.current?.click()}
              disabled={extracting}
              style={{ padding: '10px 14px', borderRadius: 7, border: '1px solid rgba(37,99,235,0.18)', background: extracting ? '#cfd7e6' : '#2563EB', color: '#fff', cursor: extracting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
            >
              {extracting ? 'Analyse en cours...' : 'Charger un bon d achat'}
            </button>
          </div>
        </div>
        {(aiFileName || aiSummary || aiWarnings.length > 0) && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gap: 8 }}>
            {aiFileName && (
              <div style={{ fontSize: 12, color: '#6b6860' }}>
                Document: <strong style={{ color: '#1a1916' }}>{aiFileName}</strong>
              </div>
            )}
            {aiSummary && (
              <div style={{ fontSize: 12, color: '#1a1916' }}>{aiSummary}</div>
            )}
            {aiWarnings.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {aiWarnings.map((warning, index) => (
                  <div key={`${warning}-${index}`} style={{ fontSize: 12, color: '#b45309', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 7, padding: '8px 10px' }}>
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Type de bon d achat</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
          {SEGMENTS.map((segment) => {
            const active = mode === segment.key
            return (
              <button
                key={segment.key}
                onClick={() => setMode(segment.key)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: `1px solid ${active ? '#2563EB' : 'rgba(0,0,0,0.1)'}`,
                  background: active ? 'rgba(37,99,235,0.06)' : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#2563EB' : '#1a1916', marginBottom: 4 }}>{segment.label}</div>
                <div style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.55 }}>{segment.note}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Fournisseur</label>
            <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nom du fournisseur" style={inp} />
          </div>
          <div>
            <label style={lbl}>Reference</label>
            <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="BA-2026-001" style={inp} />
          </div>
          <div>
            <label style={lbl}>Date achat</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inp} />
          </div>
          {mode === 'import' && (
            <div>
              <label style={lbl}>Devise</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inp}>
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Transport, douane, precisions fournisseur..." style={{ ...inp, resize: 'vertical' }} />
        </div>
      </div>

      {mode === 'import' && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px' }}>Autres frais</div>
              <div style={{ fontSize: 12, color: '#6b6860', marginTop: 4 }}>Ajoutez plusieurs frais avec leur nom et leur montant.</div>
            </div>
            <button onClick={addExtraCost} style={{ padding: '8px 12px', fontSize: 12, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ajouter un frais</button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {extraCosts.map((cost, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(160px,.8fr) 44px', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={lbl}>Nom du frais</label>
                  <input value={cost.name} onChange={(e) => updateExtraCost(index, { name: e.target.value })} placeholder="Transport, douane, assurance..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Montant ({currency})</label>
                  <input type="number" min="0" step="0.01" value={cost.amount} onChange={(e) => updateExtraCost(index, { amount: e.target.value })} placeholder="0.00" style={inp} />
                </div>
                <button onClick={() => removeExtraCost(index)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,38,38,0.18)', background: 'rgba(220,38,38,0.05)', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>-</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px' }}>Lignes d achat</div>
            <div style={{ fontSize: 12, color: '#6b6860', marginTop: 4 }}>Chaque ligne cree une entree de stock et un lot.</div>
          </div>
          <button onClick={addLine} style={{ padding: '8px 12px', fontSize: 12, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ajouter une ligne</button>
        </div>

        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{ background: '#f0eeea' }}>
                {[
                  'Produit',
                  'Quantite',
                  `Prix achat saisi (${currency})`,
                  mode === 'import' ? `Nouveau prix (${currency})` : 'Valeur finale',
                  'Sous-total ligne',
                  mode === 'import' ? 'Frais repartis' : 'Total ligne',
                  'Code lot',
                  'Notes',
                  '',
                ].map((header) => (
                  <th key={header} style={{ fontSize: 11, fontWeight: 600, color: '#a8a69e', textTransform: 'uppercase', padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const preview = linePreview.lines[index]
                return (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '10px 12px', minWidth: 220 }}>
                      <select value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })} style={{ ...inp, background: '#fff' }}>
                        <option value="">Selectionner un produit stocke</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      <input type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} style={{ ...inp, background: '#fff' }} />
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 160 }}>
                      <input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(index, { unitCost: e.target.value })} style={{ ...inp, background: '#fff' }} />
                      <div style={{ fontSize: 10, color: '#6b6860', marginTop: 4 }}>
                        {mode === 'import'
                          ? `Base: ${formatMoney(preview?.unitCost || 0, currency)}`
                          : `Total ligne: ${formatMoney(preview?.baseTotal || 0, currency)}`}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: '#16a34a', fontWeight: 700, minWidth: 170 }}>
                      <div>{formatMoney(preview?.effectiveUnitCost || 0, currency)}</div>
                      {mode === 'import' && (
                        <div style={{ fontSize: 10, color: '#6b6860', fontWeight: 500, marginTop: 3 }}>
                          base {formatMoney(preview?.unitCost || 0, currency)} + frais {formatMoney(preview?.extraAllocated || 0, currency)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: '#1a1916', fontWeight: 700, minWidth: 150 }}>
                      {formatMoney(roundMoney((preview?.quantity || 0) * (preview?.effectiveUnitCost || 0)), currency)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: mode === 'import' ? '#d97706' : '#6b6860', minWidth: 130 }}>
                      {mode === 'import' ? formatMoney(preview?.extraAllocated || 0, currency) : formatMoney(preview?.baseTotal || 0, currency)}
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 150 }}>
                      <input value={line.lotCode} onChange={(e) => updateLine(index, { lotCode: e.target.value })} placeholder={`LOT-${index + 1}`} style={{ ...inp, background: '#fff', fontFamily: 'JetBrains Mono,monospace' }} />
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 220 }}>
                      <input value={line.notes} onChange={(e) => updateLine(index, { notes: e.target.value })} placeholder="Commentaire ligne" style={{ ...inp, background: '#fff' }} />
                    </td>
                    <td style={{ padding: '10px 12px', width: 44 }}>
                      <button onClick={() => removeLine(index)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,38,38,0.18)', background: 'rgba(220,38,38,0.05)', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>-</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px' }}>Derniers bons d achat</div>
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#a8a69e' }}>Chargement...</div>
            ) : purchases.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#a8a69e' }}>Aucun achat enregistre pour le moment.</div>
            ) : purchases.map((purchase) => (
              <div key={purchase.id} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1916' }}>{purchase.supplier_name}</div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: purchase.document_kind === 'import' ? 'rgba(217,119,6,0.12)' : 'rgba(37,99,235,0.08)', color: purchase.document_kind === 'import' ? '#b45309' : '#2563EB', fontWeight: 700 }}>
                    {purchase.document_kind === 'import' ? `Importation ${purchase.currency || 'DZD'}` : 'Simple'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b6860', marginBottom: 6 }}>
                  {purchase.reference_number || 'Sans reference'} · {new Date(purchase.purchase_date).toLocaleDateString('fr-DZ')}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#6b6860' }}>
                  <span>Sous-total: <strong style={{ color: '#1a1916' }}>{formatMoney(Number(purchase.subtotal || 0), purchase.currency || 'DZD')}</strong></span>
                  <span>Frais: <strong style={{ color: '#d97706' }}>{formatMoney(Number(purchase.extra_costs_total || 0), purchase.currency || 'DZD')}</strong></span>
                  <span>Total: <strong style={{ color: '#16a34a' }}>{formatMoney(Number(purchase.grand_total || 0), purchase.currency || 'DZD')}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '18px 20px', position: 'sticky', top: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a69e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>Synthese achat</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b6860' }}>
              <span>Mode</span>
              <strong style={{ color: '#1a1916' }}>{mode === 'import' ? 'Importation' : 'Simple'}</strong>
            </div>
            {mode === 'import' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b6860' }}>
                <span>Devise</span>
                <strong style={{ color: '#1a1916' }}>{currency}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b6860' }}>
              <span>Sous-total lignes</span>
              <strong style={{ color: '#1a1916' }}>{formatMoney(linePreview.subtotal, currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b6860' }}>
              <span>Autres frais</span>
              <strong style={{ color: '#d97706' }}>{formatMoney(linePreview.extra, currency)}</strong>
            </div>
            {mode === 'import' && linePreview.normalizedCosts.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {linePreview.normalizedCosts.map((cost, index) => (
                  <div key={`${cost.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6860' }}>
                    <span>{cost.name}</span>
                    <strong style={{ color: '#1a1916' }}>{formatMoney(cost.amount, currency)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#1a1916' }}>
              <span style={{ fontWeight: 700 }}>Total valorise</span>
              <strong style={{ color: '#16a34a' }}>{formatMoney(linePreview.grandTotal, currency)}</strong>
            </div>
            <div style={{ fontSize: 11, color: '#6b6860', lineHeight: 1.6 }}>
              En importation, les autres frais sont repartis au prorata des quantites achetees. Le cout final des lots alimente directement votre methode FIFO, CUMP ou LIFO.
            </div>
            <button onClick={submit} disabled={saving} style={{ marginTop: 6, padding: '11px 14px', borderRadius: 7, border: 'none', background: saving ? '#a8a69e' : '#2563EB', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer le bon d achat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
