import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type ProductOption = {
  id: string
  name: string
  unit?: string | null
}

export type ScannedPurchaseLine = {
  raw_name: string
  raw_description: string | null
  matched_product_id: string | null
  matched_product_name: string | null
  quantity: number
  unit_cost: number
  lot_code: string | null
  notes: string | null
  confidence: number
}

export type ScannedExtraCost = {
  name: string
  amount: number
}

export type ScannedPurchasePayload = {
  supplierName: string
  clientName: string | null
  referenceNumber: string | null
  purchaseDate: string | null
  documentPlace: string | null
  currency: string
  purchaseType: 'simple' | 'import'
  documentKind: 'purchase_invoice' | 'purchase_order' | 'unknown'
  vatSummary: string | null
  notes: string | null
  confidenceSummary: string
  warnings: string[]
  extraCosts: ScannedExtraCost[]
  items: ScannedPurchaseLine[]
  rawText: string
}

const SUPPORTED_CURRENCIES = ['DZD', 'EUR', 'USD', 'CNY', 'GBP', 'MAD', 'TND'] as const
const EXTRA_COST_KEYWORDS = [
  'transport',
  'douane',
  'assurance',
  'transit',
  'fret',
  'manutention',
  'frais',
  'livraison',
  'port',
]
const PLACEHOLDER_PATTERNS = [
  'nom de l entreprise',
  'entreprise du client',
  'adresse',
  'ville et code postal',
  'numero de telephone',
  'email',
  'detailler prestation ici',
]

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumberToken(token: string) {
  const cleaned = token
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : NaN
}

function parseDateCandidate(text: string) {
  const slashMatch = text.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/)
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch
    return `${yyyy}-${mm}-${dd}`
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (isoMatch) return isoMatch[0]

  const shortYearMatch = text.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{2})\b/)
  if (shortYearMatch) {
    const [, dd, mm, yy] = shortYearMatch
    return `20${yy}-${mm}-${dd}`
  }

  return null
}

function detectCurrency(text: string) {
  const upper = text.toUpperCase()
  for (const currency of SUPPORTED_CURRENCIES) {
    if (upper.includes(currency)) return currency
  }
  if (upper.includes('DA')) return 'DZD'
  if (upper.includes('$')) return 'USD'
  if (upper.includes('EUR') || upper.includes('€')) return 'EUR'
  return 'DZD'
}

function scoreProductMatch(source: string, candidate: ProductOption) {
  const sourceTokens = new Set(normalizeForMatch(source).split(' ').filter(Boolean))
  const candidateTokens = new Set(normalizeForMatch(candidate.name).split(' ').filter(Boolean))
  if (!sourceTokens.size || !candidateTokens.size) return 0

  let matches = 0
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) matches += 1
  }

  return matches / Math.max(sourceTokens.size, candidateTokens.size)
}

function matchProduct(rawName: string, products: ProductOption[]) {
  let best: ProductOption | null = null
  let bestScore = 0

  for (const product of products) {
    const score = scoreProductMatch(rawName, product)
    if (score > bestScore) {
      best = product
      bestScore = score
    }
  }

  return bestScore >= 0.45 ? { product: best, score: bestScore } : { product: null, score: bestScore }
}

function detectDocumentKind(text: string): 'purchase_invoice' | 'purchase_order' | 'unknown' {
  const lower = normalizeForMatch(text)
  if (lower.includes('facture')) return 'purchase_invoice'
  if (lower.includes('bon d achat') || lower.includes('bon de commande') || lower.includes('purchase order')) {
    return 'purchase_order'
  }
  return 'unknown'
}

async function readPdfText(file: File) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []

  for (let index = 1; index <= Math.min(pdf.numPages, 4); index += 1) {
    const page = await pdf.getPage(index)
    const content = await page.getTextContent()
    const rows = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => ({
        str: normalizeSpace(item.str || ''),
        x: Math.round(item.transform?.[4] || 0),
        y: Math.round(item.transform?.[5] || 0),
      }))
      .filter((item: { str: string }) => item.str)
      .sort((a: { y: number; x: number }, b: { y: number; x: number }) => b.y - a.y || a.x - b.x)

    const lines: string[] = []
    let current: Array<{ str: string; x: number; y: number }> = []
    let currentY: number | null = null

    for (const row of rows) {
      if (currentY === null || Math.abs(row.y - currentY) <= 2) {
        currentY = currentY ?? row.y
        current.push(row)
      } else {
        lines.push(current.sort((a, b) => a.x - b.x).map((item) => item.str).join(' | '))
        currentY = row.y
        current = [row]
      }
    }

    if (current.length > 0) {
      lines.push(current.sort((a, b) => a.x - b.x).map((item) => item.str).join(' | '))
    }

    pageTexts.push(lines.map((line) => normalizeSpace(line)).filter(Boolean).join('\n'))
  }

  return pageTexts.join('\n')
}

async function renderPdfToImages(file: File) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const images: string[] = []

  for (let index = 1; index <= Math.min(pdf.numPages, 3); index += 1) {
    const page = await pdf.getPage(index)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) continue
    await page.render({ canvas, canvasContext: context, viewport }).promise
    images.push(canvas.toDataURL('image/png'))
  }

  return images
}

async function readImageAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

async function runOcrOnImages(images: string[]) {
  const chunks: string[] = []
  for (const image of images) {
    const result = await Tesseract.recognize(image, 'fra+eng', {
      logger: () => undefined,
    })
    chunks.push(normalizeSpace(result.data.text || ''))
  }
  return chunks.join('\n')
}

async function extractRawText(file: File) {
  if (file.type === 'application/pdf') {
    const directText = await readPdfText(file)
    if (directText.replace(/\s/g, '').length >= 80) {
      return directText
    }
    const images = await renderPdfToImages(file)
    return await runOcrOnImages(images)
  }

  const image = await readImageAsDataUrl(file)
  return await runOcrOnImages([image])
}

function findSupplier(lines: string[]) {
  const supplierLine = lines.find((line) => /fournisseur|supplier|vendeur|ste|sarl|eurl/i.test(line))
  if (supplierLine) {
    const candidate = supplierLine.split(/[:\-]/).slice(1).join(' ').trim()
    if (candidate) return candidate
  }

  const candidates = lines
    .slice(0, 12)
    .map((line) => normalizeSpace(line))
    .filter((line) => /[A-Za-z]/.test(line))
    .filter((line) => !parseDateCandidate(line))
    .filter((line) => !PLACEHOLDER_PATTERNS.some((pattern) => normalizeForMatch(line).includes(pattern)))
    .filter((line) => !/facture|invoice|date|echeance|total|tva|ttc|description/i.test(line))

  return candidates[0] || ''
}

function findClient(lines: string[]) {
  const dualColumn = lines
    .slice(0, 6)
    .map((line) => line.split('|').map((part) => normalizeSpace(part)).filter(Boolean))
    .find((parts) => parts.length >= 2 && !/bon de commande|facture|invoice/i.test(parts.join(' ')))

  if (dualColumn && dualColumn[1]) return dualColumn[1]
  return null
}

function findReference(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:facture|invoice|ref(?:erence)?|bc|bl|bon|commande|n[\u00b0ºo])\s*[:\-#]?\s*([A-Z0-9\/._-]+)/i)
    if (match) return match[1]
  }
  return null
}

function findDocumentDate(lines: string[]) {
  for (const line of lines) {
    if (/date|emise le|facture le|achat le|commande le/i.test(line)) {
      const date = parseDateCandidate(line)
      if (date) return date
    }
  }

  for (const line of lines) {
    const date = parseDateCandidate(line)
    if (date) return date
  }

  return null
}

function findDocumentPlace(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:le\s+\d{2}[\/.-]\d{2}[\/.-]\d{4}\s*,\s*)([A-Za-zÀ-ÿ' -]+)/i)
    if (match) return normalizeSpace(match[1])
  }
  return null
}

function findVatSummary(lines: string[]) {
  const vatLines = lines
    .filter((line) => /tva|taxe|vat/i.test(line))
    .map((line) => normalizeSpace(line))
    .filter(Boolean)

  if (!vatLines.length) return null

  const useful = vatLines
    .slice(0, 3)
    .join(' | ')

  return useful || null
}

function extractExtraCosts(lines: string[]) {
  const costs: ScannedExtraCost[] = []

  for (const line of lines) {
    const lower = normalizeForMatch(line)
    const keyword = EXTRA_COST_KEYWORDS.find((item) => lower.includes(item))
    if (!keyword) continue

    const numbers = line.match(/-?\d[\d\s.,]*/g) || []
    const lastNumber = numbers.length > 0 ? parseNumberToken(numbers[numbers.length - 1]) : NaN
    if (!Number.isFinite(lastNumber) || lastNumber <= 0) continue

    costs.push({
      name: normalizeSpace(line.replace(/-?\d[\d\s.,]*/g, '').replace(/[:\-]/g, ' ')) || keyword,
      amount: roundMoney(lastNumber),
    })
  }

  const deduped = new Map<string, ScannedExtraCost>()
  for (const cost of costs) {
    const key = normalizeForMatch(cost.name)
    if (!deduped.has(key)) deduped.set(key, cost)
  }

  return Array.from(deduped.values())
}

function extractItemCandidates(lines: string[], products: ProductOption[]) {
  const items: ScannedPurchaseLine[] = []
  let pendingDescription: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (items.length >= 20) break
    const compact = normalizeSpace(line)
    if (compact.length < 6) continue

    const lower = normalizeForMatch(compact)
    if (EXTRA_COST_KEYWORDS.some((keyword) => lower.includes(keyword))) continue
    if (PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern))) continue
    if (/total|montant|tva|ttc|net a payer|signature|cachet|date|echeance|siret|telephone|email/i.test(compact)) continue

    const quantityWithUnit = compact.match(/(\d+(?:[.,]\d+)?)\s*\(([^)]+)\)/i)
    const hasPricedRow = quantityWithUnit || (compact.match(/-?\d[\d\s.,]*/g) || []).length >= 3

    if (!hasPricedRow) {
      pendingDescription.push(compact.replace(/\|/g, ' '))
      if (pendingDescription.length > 4) pendingDescription = pendingDescription.slice(-4)
      continue
    }

    const numbers = compact.match(/-?\d[\d\s.,]*/g) || []
    if (numbers.length < 2) continue

    const parsedNumbers = numbers.map(parseNumberToken).filter((value) => Number.isFinite(value))
    if (parsedNumbers.length < 2) continue

    let quantity = parsedNumbers[0]
    let unitCost = parsedNumbers[parsedNumbers.length - 1]
    const lineTotal = parsedNumbers[parsedNumbers.length - 1]

    if (parsedNumbers.length >= 3) {
      const candidateQuantity = parsedNumbers.find((value) => value > 0 && value <= 100000) || parsedNumbers[0]
      const secondLast = parsedNumbers[parsedNumbers.length - 2]
      quantity = candidateQuantity

      if (candidateQuantity > 0 && secondLast > 0 && Math.abs((secondLast * candidateQuantity) - lineTotal) <= Math.max(1, lineTotal * 0.08)) {
        unitCost = secondLast
      } else if (candidateQuantity > 0 && lineTotal >= candidateQuantity) {
        unitCost = roundMoney(lineTotal / candidateQuantity)
      } else {
        unitCost = secondLast
      }
    }

    if (!(quantity > 0) || !(unitCost >= 0)) continue

    const quantityLabel = quantityWithUnit?.[0] || ''
    const beforeQty = quantityLabel
      ? compact.split(quantityLabel)[0]
      : compact.replace(/-?\d[\d\s.,]*/g, ' ')
    const nextLine = normalizeSpace(lines[index + 1] || '')
    const nextIsShortDescriptor = nextLine && !/-?\d[\d\s.,]*/.test(nextLine) && nextLine.length <= 80 && !/total|tva|ttc/i.test(nextLine)
    const mergedText = normalizeSpace([
      ...pendingDescription,
      beforeQty.replace(/\|/g, ' '),
      nextIsShortDescriptor ? nextLine.replace(/\|/g, ' ') : '',
    ].filter(Boolean).join(' '))
    if (!mergedText || mergedText.length < 3 || /^[-. ]+$/.test(mergedText)) continue
    pendingDescription = []

    const mergedParts = mergedText
      .split(/\s{2,}|\s\|\s|\n/)
      .map((part) => normalizeSpace(part))
      .filter(Boolean)
    const rawName = mergedParts[0] || mergedText
    const rawDescription = mergedParts.length > 1 ? mergedParts.slice(1).join('\n') : null

    const matched = matchProduct(rawName, products)
    items.push({
      raw_name: rawName,
      raw_description: rawDescription,
      matched_product_id: matched.product?.id || null,
      matched_product_name: matched.product?.name || null,
      quantity,
      unit_cost: roundMoney(unitCost),
      lot_code: null,
      notes: matched.product ? null : 'Produit a verifier.',
      confidence: matched.product ? Math.max(0.55, matched.score) : 0.35,
    })
  }

  const deduped = new Map<string, ScannedPurchaseLine>()
  for (const item of items) {
    const key = `${normalizeForMatch(item.raw_name)}|${item.quantity}|${item.unit_cost}`
    if (!deduped.has(key)) deduped.set(key, item)
  }

  return Array.from(deduped.values())
}

export async function scanPurchaseDocument(file: File, products: ProductOption[]): Promise<ScannedPurchasePayload> {
  const rawText = await extractRawText(file)
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean)

  const documentKind = detectDocumentKind(rawText)
  const items = extractItemCandidates(lines, products)
  const extraCosts: ScannedExtraCost[] = []
  const purchaseDate = findDocumentDate(lines)
  const documentPlace = findDocumentPlace(lines)
  const supplierName = findSupplier(lines)
  const clientName = findClient(lines)
  const referenceNumber = findReference(lines)
  const currency = detectCurrency(rawText)
  const vatSummary = findVatSummary(lines)
  const warnings: string[] = []

  if (!items.length) warnings.push("Aucune ligne produit fiable n'a ete detectee. Verifiez les produits manuellement.")
  if (!supplierName) warnings.push("Le fournisseur n'a pas ete identifie clairement.")
  if (!purchaseDate) warnings.push("La date du document n'a pas ete detectee.")
  if (items.some((item) => !item.matched_product_id)) warnings.push('Au moins un produit doit etre rapproche manuellement avec votre catalogue.')
  if (PLACEHOLDER_PATTERNS.some((pattern) => normalizeForMatch(rawText).includes(pattern))) {
    warnings.push("Le document ressemble a un modele vide ou a une maquette. Le scanner n'invente pas de donnees absentes.")
  }

  const documentLabel = documentKind === 'purchase_invoice'
    ? "une facture d'achat"
    : documentKind === 'purchase_order'
      ? "un bon d'achat"
      : "un document d'achat"

  return {
    supplierName,
    clientName,
    referenceNumber,
    purchaseDate,
    documentPlace,
    currency,
    purchaseType: 'simple',
    documentKind,
    vatSummary,
    notes: vatSummary ? `TVA detectee: ${vatSummary}` : null,
    confidenceSummary: items.length > 0
      ? `Lecture locale terminee sur ${documentLabel}. Verifiez les champs detectes avant enregistrement.`
      : `Lecture locale terminee sur ${documentLabel}, mais le document demande encore une verification manuelle.`,
    warnings,
    extraCosts,
    items,
    rawText,
  }
}
