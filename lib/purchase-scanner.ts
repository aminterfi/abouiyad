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
  referenceNumber: string | null
  purchaseDate: string | null
  currency: string
  purchaseType: 'simple' | 'import'
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
  return null
}

function detectCurrency(text: string) {
  const upper = text.toUpperCase()
  for (const currency of SUPPORTED_CURRENCIES) {
    if (upper.includes(currency)) return currency
  }
  if (upper.includes('DA')) return 'DZD'
  if (upper.includes('$')) return 'USD'
  if (upper.includes('€')) return 'EUR'
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

async function readPdfText(file: File) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []

  for (let index = 1; index <= Math.min(pdf.numPages, 4); index += 1) {
    const page = await pdf.getPage(index)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(normalizeSpace(text))
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

  const upperCandidates = lines
    .slice(0, 8)
    .map((line) => normalizeSpace(line))
    .filter((line) => /[A-Za-z]/.test(line) && !/\d{2}[\/.-]\d{2}[\/.-]\d{4}/.test(line))

  return upperCandidates[0] || ''
}

function findReference(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:ref(?:erence)?|bc|bon|n[°o])\s*[:\-]?\s*([A-Z0-9\/._-]+)/i)
    if (match) return match[1]
  }
  return null
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

  for (const line of lines) {
    if (items.length >= 16) break
    const compact = normalizeSpace(line)
    if (compact.length < 6) continue
    const lower = normalizeForMatch(compact)
    if (EXTRA_COST_KEYWORDS.some((keyword) => lower.includes(keyword))) continue
    if (/total|montant|tva|ttc|ht|net a payer|signature|cachet/i.test(compact)) continue

    const numbers = compact.match(/-?\d[\d\s.,]*/g) || []
    if (numbers.length < 2) continue

    const parsedNumbers = numbers.map(parseNumberToken).filter((value) => Number.isFinite(value))
    if (parsedNumbers.length < 2) continue

    const quantity = parsedNumbers[0]
    const unitCost = parsedNumbers[parsedNumbers.length - 1]
    if (!(quantity > 0) || !(unitCost >= 0)) continue

    const rawName = normalizeSpace(compact.replace(/-?\d[\d\s.,]*/g, ' ').replace(/\s+/g, ' '))
    if (!rawName || rawName.length < 3) continue

    const matched = matchProduct(rawName, products)
    items.push({
      raw_name: rawName,
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

  const items = extractItemCandidates(lines, products)
  const extraCosts = extractExtraCosts(lines)
  const dateLine = lines.find((line) => parseDateCandidate(line))
  const purchaseDate = dateLine ? parseDateCandidate(dateLine) : null
  const supplierName = findSupplier(lines)
  const referenceNumber = findReference(lines)
  const currency = detectCurrency(rawText)
  const warnings: string[] = []

  if (!items.length) warnings.push("Aucune ligne produit fiable n'a ete detectee. Verifiez les produits manuellement.")
  if (!supplierName) warnings.push("Le fournisseur n'a pas ete identifie clairement.")
  if (!purchaseDate) warnings.push("La date d'achat n'a pas ete detectee.")
  if (items.some((item) => !item.matched_product_id)) warnings.push('Au moins un produit doit etre rapproche manuellement avec votre catalogue.')

  return {
    supplierName,
    referenceNumber,
    purchaseDate,
    currency,
    purchaseType: extraCosts.length > 0 ? 'import' : 'simple',
    notes: null,
    confidenceSummary: items.length > 0
      ? 'Lecture locale terminee. Verifiez les champs detectes avant enregistrement.'
      : 'Lecture locale terminee, mais le document demande encore une verification manuelle.',
    warnings,
    extraCosts,
    items,
    rawText,
  }
}
