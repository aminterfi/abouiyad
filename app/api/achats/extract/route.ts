import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const runtime = 'nodejs'

type ProductOption = {
  id: string
  name: string
  unit: string | null
}

type ExtractedLine = {
  raw_name: string
  matched_product_id: string | null
  matched_product_name: string | null
  quantity: number
  unit_cost: number
  lot_code: string | null
  notes: string | null
  confidence: number
}

type ExtractedExtraCost = {
  name: string
  amount: number
}

type ExtractedPurchase = {
  supplier_name: string
  reference_number: string | null
  purchase_date: string | null
  currency: string | null
  purchase_type: 'simple' | 'import'
  notes: string | null
  confidence_summary: string
  warnings: string[]
  extra_costs: ExtractedExtraCost[]
  items: ExtractedLine[]
}

const SUPPORTED_CURRENCIES = new Set(['DZD', 'EUR', 'USD', 'CNY', 'GBP', 'MAD', 'TND'])
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
])

const extractionSchema = {
  name: 'purchase_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'supplier_name',
      'reference_number',
      'purchase_date',
      'currency',
      'purchase_type',
      'notes',
      'confidence_summary',
      'warnings',
      'extra_costs',
      'items',
    ],
    properties: {
      supplier_name: { type: 'string' },
      reference_number: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      purchase_date: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      currency: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      purchase_type: {
        type: 'string',
        enum: ['simple', 'import'],
      },
      notes: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      confidence_summary: { type: 'string' },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
      extra_costs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'amount'],
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'raw_name',
            'matched_product_id',
            'matched_product_name',
            'quantity',
            'unit_cost',
            'lot_code',
            'notes',
            'confidence',
          ],
          properties: {
            raw_name: { type: 'string' },
            matched_product_id: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            matched_product_name: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            quantity: { type: 'number' },
            unit_cost: { type: 'number' },
            lot_code: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            notes: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            confidence: { type: 'number' },
          },
        },
      },
    },
  },
} as const

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Analyse impossible.'
}

async function resolveWorkspaceCreator(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  email: string,
  companyId: string,
) {
  const [userResult, ownerResult, membershipResult] = await Promise.all([
    userId
      ? admin.from('users').select('id').eq('id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('users').select('id').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
    userId
      ? admin.from('owners').select('user_id').eq('user_id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('owners').select('user_id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
    userId
      ? admin.from('workspace_memberships').select('user_id').eq('user_id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('workspace_memberships').select('user_id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
  ])

  if (userResult.error && userResult.error.code !== 'PGRST116') throw userResult.error
  if (ownerResult.error && ownerResult.error.code !== 'PGRST116') throw ownerResult.error
  if (membershipResult.error && membershipResult.error.code !== 'PGRST116') throw membershipResult.error

  if (userResult.data?.id) return userResult.data.id
  if (ownerResult.data?.user_id) return ownerResult.data.user_id
  if (membershipResult.data?.user_id) return membershipResult.data.user_id

  if (email) {
    const [userByEmail, ownerByEmail] = await Promise.all([
      admin.from('users').select('id').eq('email', email).eq('company_id', companyId).maybeSingle(),
      admin.from('owners').select('user_id').eq('email', email).eq('company_id', companyId).maybeSingle(),
    ])

    if (userByEmail.error && userByEmail.error.code !== 'PGRST116') throw userByEmail.error
    if (ownerByEmail.error && ownerByEmail.error.code !== 'PGRST116') throw ownerByEmail.error

    if (userByEmail.data?.id) return userByEmail.data.id
    if (ownerByEmail.data?.user_id) return ownerByEmail.data.user_id
  }

  return null
}

async function loadCompanyProducts(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  companyId: string,
) {
  const { data, error } = await admin
    .from('products')
    .select('id,name,unit')
    .eq('company_id', companyId)
    .eq('is_archived', false)
    .eq('is_stockable', true)
    .eq('track_stock', true)
    .order('name')

  if (error) throw error
  return (data || []) as ProductOption[]
}

function buildProductCatalog(products: ProductOption[]) {
  return products
    .slice(0, 250)
    .map((product) => `- ${product.id} | ${product.name}${product.unit ? ` | unite: ${product.unit}` : ''}`)
    .join('\n')
}

function normalizeCurrency(value: string | null) {
  const next = String(value || '').trim().toUpperCase()
  return SUPPORTED_CURRENCIES.has(next) ? next : null
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function normalizeExtraction(data: ExtractedPurchase, products: ProductOption[]) {
  const productMap = new Map(products.map((product) => [product.id, product]))

  const items = Array.isArray(data.items)
    ? data.items
      .map((item) => {
        const matchedProduct = item.matched_product_id ? productMap.get(item.matched_product_id) : null
        return {
          raw_name: String(item.raw_name || '').trim(),
          matched_product_id: matchedProduct?.id || null,
          matched_product_name: matchedProduct?.name || item.matched_product_name || null,
          quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Number(item.quantity) : 0,
          unit_cost: Number.isFinite(item.unit_cost) && item.unit_cost >= 0 ? Number(item.unit_cost) : 0,
          lot_code: String(item.lot_code || '').trim() || null,
          notes: String(item.notes || '').trim() || null,
          confidence: clampConfidence(Number(item.confidence)),
        }
      })
      .filter((item) => item.raw_name && item.quantity > 0)
    : []

  const extraCosts = Array.isArray(data.extra_costs)
    ? data.extra_costs
      .map((cost) => ({
        name: String(cost.name || '').trim(),
        amount: Number.isFinite(cost.amount) && cost.amount > 0 ? Number(cost.amount) : 0,
      }))
      .filter((cost) => cost.name && cost.amount > 0)
    : []

  const purchaseType = data.purchase_type === 'import' || extraCosts.length > 0 ? 'import' : 'simple'

  return {
    supplierName: String(data.supplier_name || '').trim(),
    referenceNumber: String(data.reference_number || '').trim() || null,
    purchaseDate: String(data.purchase_date || '').trim() || null,
    currency: normalizeCurrency(data.currency) || 'DZD',
    purchaseType,
    notes: String(data.notes || '').trim() || null,
    confidenceSummary: String(data.confidence_summary || '').trim() || 'Extraction terminee.',
    warnings: Array.isArray(data.warnings)
      ? data.warnings.map((warning) => String(warning || '').trim()).filter(Boolean)
      : [],
    extraCosts,
    items,
  }
}

async function extractWithOpenAI(file: File, products: ProductOption[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante. Ajoutez-la cote serveur pour activer l'analyse IA.")
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = file.type || 'application/octet-stream'
  const isImage = mimeType.startsWith('image/')
  const model = process.env.OPENAI_BON_ACHAT_MODEL || 'gpt-4o-mini'

  const instructions = [
    'Tu analyses un bon d achat fournisseur pour une application de gestion de stock francophone.',
    'Lis le document avec precision puis retourne uniquement les donnees structurees demandees.',
    'Quand un produit du document correspond clairement a un produit du catalogue, renseigne matched_product_id avec l identifiant exact du catalogue.',
    'S il n y a pas de correspondance fiable, laisse matched_product_id a null et conserve le libelle lu dans raw_name.',
    'Les quantites et prix unitaires doivent etre numeriques.',
    'Si le document contient des frais comme transport, douane, assurance, transit ou manutention, ajoute-les dans extra_costs et marque purchase_type a import.',
    'Si aucun frais annexe n apparait, utilise purchase_type simple.',
    'Pour les dates, utilise le format YYYY-MM-DD si tu es suffisamment confiant, sinon null.',
    'Pour la devise, privilegie DZD, EUR, USD, CNY, GBP, MAD ou TND. Si tu ne peux pas la determiner, retourne null.',
    'Donne des warnings courts pour les zones ambigues: produit non matche, quantite incertaine, prix douteux, devise absente, etc.',
  ].join(' ')

  const catalog = buildProductCatalog(products) || '- aucun produit catalogue'

  const userText = [
    'Catalogue de produits stockables disponibles pour faire le rapprochement:',
    catalog,
    '',
    'Analyse ce bon d achat et remplis le schema JSON demande.',
  ].join('\n')

  const content: Array<Record<string, unknown>> = [
    { type: 'input_text', text: userText },
  ]

  if (isImage) {
    content.push({
      type: 'input_image',
      image_url: `data:${mimeType};base64,${base64}`,
      detail: 'high',
    })
  } else {
    content.push({
      type: 'input_file',
      filename: file.name,
      file_data: base64,
    })
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: instructions }] },
        { role: 'user', content },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...extractionSchema,
        },
      },
      max_output_tokens: 4000,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const apiMessage = payload?.error?.message || 'Analyse OpenAI impossible.'
    throw new Error(apiMessage)
  }

  const outputText = typeof payload?.output_text === 'string'
    ? payload.output_text
    : ''

  if (!outputText) {
    throw new Error("L'IA n'a pas retourne de resultat exploitable.")
  }

  return JSON.parse(outputText) as ExtractedPurchase
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const companyId = String(formData.get('companyId') || '').trim()
    const createdBy = String(formData.get('createdBy') || '').trim()
    const creatorEmail = String(formData.get('creatorEmail') || '').trim().toLowerCase()
    const file = formData.get('file')

    if (!companyId || (!createdBy && !creatorEmail)) {
      return NextResponse.json({ error: 'Informations utilisateur manquantes.' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 })
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Formats supportes: PDF, PNG, JPG, WEBP.' }, { status: 400 })
    }

    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Maximum 12 MB.' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const creatorId = await resolveWorkspaceCreator(admin, createdBy, creatorEmail, companyId)
    if (!creatorId) {
      return NextResponse.json({ error: 'Utilisateur non autorise pour cette entreprise.' }, { status: 403 })
    }

    const products = await loadCompanyProducts(admin, companyId)
    const extracted = await extractWithOpenAI(file, products)
    const normalized = normalizeExtraction(extracted, products)

    if (!normalized.items.length) {
      normalized.warnings = [
        ...normalized.warnings,
        "Aucune ligne produit certaine n'a ete detectee. Verifiez le document et completez manuellement.",
      ]
    }

    return NextResponse.json({
      ok: true,
      extraction: normalized,
    })
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
