import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

type ExtractedPurchase = {
  supplier_name: string
  reference_number: string | null
  purchase_date: string | null
  currency: string | null
  purchase_type: 'simple' | 'import'
  notes: string | null
  confidence_summary: string
  warnings: string[]
  extra_costs: Array<{ name: string; amount: number }>
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
      reference_number: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      purchase_date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      purchase_type: { type: 'string', enum: ['simple', 'import'] },
      notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      confidence_summary: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } },
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
            matched_product_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            matched_product_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            quantity: { type: 'number' },
            unit_cost: { type: 'number' },
            lot_code: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            confidence: { type: 'number' },
          },
        },
      },
    },
  },
} as const

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Analyse impossible.'
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
    confidenceSummary: String(data.confidence_summary || '').trim() || 'Analyse terminee.',
    warnings: Array.isArray(data.warnings)
      ? data.warnings.map((warning) => String(warning || '').trim()).filter(Boolean)
      : [],
    extraCosts,
    items,
  }
}

async function resolveWorkspaceCreator(
  admin: ReturnType<typeof createClient>,
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

async function loadCompanyProducts(admin: ReturnType<typeof createClient>, companyId: string) {
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

async function extractWithOpenAI(file: File, products: ProductOption[]) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante dans les secrets Supabase.")
  }

  const bytes = await file.arrayBuffer()
  let binary = ''
  const chunk = 0x8000
  const view = new Uint8Array(bytes)
  for (let index = 0; index < view.length; index += chunk) {
    binary += String.fromCharCode(...view.subarray(index, index + chunk))
  }
  const base64 = btoa(binary)
  const mimeType = file.type || 'application/octet-stream'
  const isImage = mimeType.startsWith('image/')
  const model = Deno.env.get('OPENAI_BON_ACHAT_MODEL') || 'gpt-4o-mini'

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
  const content: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: `Catalogue de produits stockables disponibles pour faire le rapprochement:\n${catalog}\n\nAnalyse ce bon d achat et remplis le schema JSON demande.`,
    },
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
    throw new Error(payload?.error?.message || 'Analyse OpenAI impossible.')
  }

  if (typeof payload?.output_text !== 'string' || !payload.output_text) {
    throw new Error("L'IA n'a pas retourne de resultat exploitable.")
  }

  return JSON.parse(payload.output_text) as ExtractedPurchase
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Methode non supportee.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Secrets Supabase incomplets pour la fonction.')
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return json({ error: 'Session requise.' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: authError } = await authClient.auth.getUser()
    if (authError) throw authError
    if (!userData.user) {
      return json({ error: 'Session invalide.' }, 401)
    }

    const formData = await request.formData()
    const companyId = String(formData.get('companyId') || '').trim()
    const creatorEmail = String(formData.get('creatorEmail') || '').trim().toLowerCase()
    const file = formData.get('file')

    if (!companyId) {
      return json({ error: 'Entreprise requise.' }, 400)
    }

    if (!(file instanceof File)) {
      return json({ error: 'Fichier requis.' }, 400)
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return json({ error: 'Formats supportes: PDF, PNG, JPG, WEBP.' }, 400)
    }

    if (file.size > 12 * 1024 * 1024) {
      return json({ error: 'Fichier trop volumineux. Maximum 12 MB.' }, 400)
    }

    const creatorId = await resolveWorkspaceCreator(admin, userData.user.id, creatorEmail || userData.user.email || '', companyId)
    if (!creatorId) {
      return json({ error: 'Utilisateur non autorise pour cette entreprise.' }, 403)
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

    return json({
      ok: true,
      extraction: normalized,
    })
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error) }, 500)
  }
})
