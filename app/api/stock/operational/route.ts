import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'
import {
  computeMovingWeightedAverage,
  normalizeStockMethod,
  type StockMethod,
} from '@/lib/stock-method'

type StockPayload = {
  kind?: 'manual_movement' | 'inventory_count' | 'purchase_receipt'
  companyId?: string
  createdBy?: string
  creatorEmail?: string | null
  productId?: string
  movementType?: 'entry' | 'adjustment_add' | 'adjustment_sub'
  quantity?: number | string
  unitCost?: number | string | null
  notes?: string | null
  lotCode?: string | null
  adjustments?: Array<{
    productId?: string
    countedQuantity?: number | string
  }>
  purchaseType?: 'simple' | 'import'
  currency?: string | null
  supplierName?: string
  referenceNumber?: string | null
  purchaseDate?: string | null
  extraCostsTotal?: number | string | null
  extraCosts?: Array<{
    name?: string
    amount?: number | string
  }>
  items?: Array<{
    productId?: string
    quantity?: number | string
    unitCost?: number | string
    lotCode?: string | null
    notes?: string | null
  }>
}

type ProductRow = {
  id: string
  name: string
  company_id: string
  stock_quantity: number | null
  cost_price: number | null
  is_stockable: boolean | null
  track_stock: boolean | null
}

type LotRow = {
  id: string
  lot_code: string
  remaining_quantity: number
  unit_cost: number
  received_at: string
  created_at: string
}

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function isSchemaFallbackError(message: string) {
  const lower = message.toLowerCase()
  return lower.includes('does not exist') || lower.includes('schema cache') || lower.includes('column')
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

async function loadInventoryMethod(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  companyId: string,
) {
  try {
    const { data, error } = await admin
      .from('settings')
      .select('inventory_method')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) throw error
    return normalizeStockMethod(data?.inventory_method)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isSchemaFallbackError(message)) return 'fifo' as StockMethod
    throw error
  }
}

async function loadProduct(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  companyId: string,
  productId: string,
) {
  const { data, error } = await admin
    .from('products')
    .select('id,name,company_id,stock_quantity,cost_price,is_stockable,track_stock')
    .eq('company_id', companyId)
    .eq('id', productId)
    .maybeSingle()

  if (error) throw error
  return data as ProductRow | null
}

async function loadOpenLots(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  companyId: string,
  productId: string,
  method: StockMethod,
) {
  const ascending = method !== 'lifo'
  const { data, error } = await admin
    .from('stock_lots')
    .select('id,lot_code,remaining_quantity,unit_cost,received_at,created_at')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .gt('remaining_quantity', 0)
    .order('received_at', { ascending })
    .order('created_at', { ascending })

  if (error) throw error
  return (data || []) as LotRow[]
}

async function recomputeProductCost(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  companyId: string,
  productId: string,
  fallbackCost: number,
) {
  try {
    const { data, error } = await admin
      .from('stock_lots')
      .select('remaining_quantity,unit_cost')
      .eq('company_id', companyId)
      .eq('product_id', productId)
      .gt('remaining_quantity', 0)

    if (error) throw error

    const rows = data || []
    const totalQty = rows.reduce((sum: number, row: any) => sum + Number(row.remaining_quantity || 0), 0)
    const totalValue = rows.reduce((sum: number, row: any) => sum + (Number(row.remaining_quantity || 0) * Number(row.unit_cost || 0)), 0)
    const nextCost = totalQty > 0 ? (totalValue / totalQty) : fallbackCost

    await admin.from('products').update({ cost_price: nextCost }).eq('id', productId)
    return nextCost
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isSchemaFallbackError(message)) return fallbackCost
    throw error
  }
}

async function insertFallbackMovement(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  params: {
    companyId: string
    createdBy: string
    creatorName: string
    product: ProductRow
    movementType: 'entry' | 'adjustment_add' | 'adjustment_sub'
    quantity: number
    unitCost: number
    notes: string | null
    valuationMethod: StockMethod
    lotCode: string | null
    referenceType?: string | null
    referenceNumber?: string | null
  },
) {
  const beforeQty = Number(params.product.stock_quantity || 0)
  const afterQty = params.movementType === 'adjustment_sub'
    ? beforeQty - params.quantity
    : beforeQty + params.quantity

  const { data, error } = await admin
    .from('stock_movements')
    .insert({
      company_id: params.companyId,
      product_id: params.product.id,
      movement_type: params.movementType,
      quantity: params.quantity,
      unit_cost: params.unitCost,
      reference_type: params.referenceType || 'manual',
      reference_number: params.referenceNumber || null,
      notes: params.notes,
      created_by: params.createdBy,
      created_by_name: params.creatorName,
      stock_before: beforeQty,
      stock_after: afterQty,
      valuation_method: params.valuationMethod,
      lot_code: params.lotCode,
    })
    .select('id')
    .single()

  if (error) throw error

  const nextQty = Math.max(0, afterQty)
  const productPatch: Record<string, unknown> = { stock_quantity: nextQty }
  if (params.movementType !== 'adjustment_sub') {
    productPatch.cost_price = params.unitCost
  }

  await admin.from('products').update(productPatch).eq('id', params.product.id)

  return data?.id || null
}

async function processManualMovement(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  params: {
    companyId: string
    createdBy: string
    creatorName: string
    productId: string
    movementType: 'entry' | 'adjustment_add' | 'adjustment_sub'
    quantity: number
    unitCost: number
    notes: string | null
    lotCode: string | null
    referenceType?: string | null
    referenceNumber?: string | null
  },
) {
  const product = await loadProduct(admin, params.companyId, params.productId)
  if (!product || !product.is_stockable || !product.track_stock) {
    throw new Error('Produit de stock introuvable ou non suivi.')
  }

  const currentQty = Number(product.stock_quantity || 0)
  if (params.movementType === 'adjustment_sub' && params.quantity > currentQty) {
    throw new Error('Quantite insuffisante dans le stock.')
  }

  const valuationMethod = await loadInventoryMethod(admin, params.companyId)
  const currentCost = Number(product.cost_price || 0)

  try {
    const movementId = await insertFallbackMovement(admin, {
      ...params,
      product,
      valuationMethod,
      unitCost: params.unitCost || currentCost || 0,
    })

    if (params.movementType !== 'adjustment_sub') {
      const fallbackCode = params.lotCode || `LOT-${new Date().toISOString().slice(0, 10)}-${String(product.name || '').slice(0, 3).toUpperCase()}`
      const { data: lot, error: lotError } = await admin
        .from('stock_lots')
        .insert({
          company_id: params.companyId,
          product_id: product.id,
          lot_code: fallbackCode,
          source_movement_id: movementId,
          initial_quantity: params.quantity,
          remaining_quantity: params.quantity,
          unit_cost: params.unitCost || currentCost || 0,
          notes: params.notes,
          created_by: params.createdBy,
        })
        .select('id')
        .single()

      if (lotError) throw lotError

      await admin
        .from('stock_movements')
        .update({
          lot_id: lot?.id || null,
          lot_code: fallbackCode,
        })
        .eq('id', movementId)

      if (valuationMethod === 'weighted_average') {
        const nextCost = computeMovingWeightedAverage(
          currentQty,
          currentCost,
          params.quantity,
          params.unitCost || currentCost || 0,
        )
        await admin.from('products').update({ cost_price: nextCost }).eq('id', product.id)
      } else {
        await recomputeProductCost(admin, params.companyId, product.id, params.unitCost || currentCost || 0)
      }

      return { movementId, valuationMethod }
    }

    const lots = await loadOpenLots(admin, params.companyId, product.id, valuationMethod)
    let remainingToConsume = params.quantity
    const allocations: Array<{ lotId: string; lotCode: string; quantity: number; unitCost: number; remainingQuantity: number }> = []

    for (const lot of lots) {
      if (remainingToConsume <= 0) break
      const available = Number(lot.remaining_quantity || 0)
      if (available <= 0) continue
      const used = Math.min(available, remainingToConsume)
      remainingToConsume -= used
      allocations.push({
        lotId: lot.id,
        lotCode: lot.lot_code,
        quantity: used,
        unitCost: valuationMethod === 'weighted_average' ? currentCost : Number(lot.unit_cost || 0),
        remainingQuantity: available - used,
      })
    }

    if (remainingToConsume > 0) {
      throw new Error('Les lots disponibles ne couvrent pas la sortie demandee.')
    }

    for (const allocation of allocations) {
      const { error: updateLotError } = await admin
        .from('stock_lots')
        .update({ remaining_quantity: allocation.remainingQuantity })
        .eq('id', allocation.lotId)

      if (updateLotError) throw updateLotError
    }

    const movementCost = valuationMethod === 'weighted_average'
      ? currentCost
      : (allocations.reduce((sum, allocation) => sum + (allocation.quantity * allocation.unitCost), 0) / params.quantity)

    await admin
      .from('stock_movements')
      .update({
        unit_cost: movementCost,
        lot_id: allocations[0]?.lotId || null,
        lot_code: allocations.map((allocation) => allocation.lotCode).join(', '),
      })
      .eq('id', movementId)

    const { error: allocationError } = await admin
      .from('stock_lot_consumptions')
      .insert(allocations.map((allocation) => ({
        company_id: params.companyId,
        product_id: product.id,
        lot_id: allocation.lotId,
        stock_movement_id: movementId,
        quantity: allocation.quantity,
        unit_cost: allocation.unitCost,
      })))

    if (allocationError) throw allocationError

    await recomputeProductCost(admin, params.companyId, product.id, currentCost)
    return { movementId, valuationMethod }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (!isSchemaFallbackError(message)) throw error

    const movementId = await insertFallbackMovement(admin, {
      ...params,
      product,
      valuationMethod,
      unitCost: params.unitCost || currentCost || 0,
    })

    if (params.movementType !== 'adjustment_sub' && valuationMethod === 'weighted_average') {
      const nextCost = computeMovingWeightedAverage(
        currentQty,
        currentCost,
        params.quantity,
        params.unitCost || currentCost || 0,
      )
      await admin.from('products').update({ cost_price: nextCost }).eq('id', product.id)
    }

    return { movementId, valuationMethod, fallback: true }
  }
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

async function processPurchaseReceipt(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  params: {
    companyId: string
    createdBy: string
    creatorName: string
    purchaseType: 'simple' | 'import'
    currency: string
    supplierName: string
    referenceNumber: string | null
    purchaseDate: string | null
    notes: string | null
    extraCosts: Array<{
      name: string
      amount: number
    }>
    items: Array<{
      productId: string
      quantity: number
      unitCost: number
      lotCode: string | null
      notes: string | null
    }>
  },
) {
  if (!params.items.length) {
    throw new Error('Aucune ligne achat a enregistrer.')
  }

  const subtotal = roundMoney(
    params.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
  )
  const normalizedCosts = params.purchaseType === 'import'
    ? params.extraCosts
      .map((cost) => ({
        name: String(cost.name || '').trim(),
        amount: roundMoney(Math.max(0, Number(cost.amount || 0))),
      }))
      .filter((cost) => cost.name && cost.amount > 0)
    : []
  const extraCostsTotal = params.purchaseType === 'import'
    ? roundMoney(normalizedCosts.reduce((sum, cost) => sum + cost.amount, 0))
    : 0

  const withAllocations = params.items.map((item) => {
    const lineBaseTotal = roundMoney(item.quantity * item.unitCost)
    const extraAllocated = subtotal > 0 && extraCostsTotal > 0
      ? roundMoney(extraCostsTotal * (lineBaseTotal / subtotal))
      : 0
    const effectiveUnitCost = item.quantity > 0
      ? roundMoney((lineBaseTotal + extraAllocated) / item.quantity)
      : roundMoney(item.unitCost)

    return {
      ...item,
      lineBaseTotal,
      extraAllocated,
      effectiveUnitCost,
    }
  })

  if (withAllocations.length > 1 && extraCostsTotal > 0) {
    const allocatedSum = roundMoney(withAllocations.reduce((sum, item) => sum + item.extraAllocated, 0))
    const gap = roundMoney(extraCostsTotal - allocatedSum)
    if (gap !== 0) {
      const last = withAllocations[withAllocations.length - 1]
      last.extraAllocated = roundMoney(last.extraAllocated + gap)
      last.effectiveUnitCost = last.quantity > 0
        ? roundMoney((last.lineBaseTotal + last.extraAllocated) / last.quantity)
        : last.effectiveUnitCost
    }
  }

  const grandTotal = roundMoney(subtotal + extraCostsTotal)
  const receivedAt = params.purchaseDate || new Date().toISOString().slice(0, 10)

  let purchaseDocumentId: string | null = null

  try {
    const { data: purchaseDocument, error: documentError } = await admin
      .from('purchase_documents')
      .insert({
        company_id: params.companyId,
        supplier_name: params.supplierName,
        document_kind: params.purchaseType,
        reference_number: params.referenceNumber,
        purchase_date: receivedAt,
        notes: params.notes,
        currency: params.currency,
        extra_costs_total: extraCostsTotal,
        subtotal,
        grand_total: grandTotal,
        status: 'received',
        created_by: params.createdBy,
        created_by_name: params.creatorName,
      })
      .select('id')
      .single()

    if (documentError) throw documentError
    purchaseDocumentId = purchaseDocument?.id || null

    if (purchaseDocumentId && normalizedCosts.length > 0) {
      const { error: costError } = await admin
        .from('purchase_document_costs')
        .insert(normalizedCosts.map((cost) => ({
          company_id: params.companyId,
          purchase_document_id: purchaseDocumentId,
          cost_name: cost.name,
          amount: cost.amount,
          currency: params.currency,
        })))

      if (costError) throw costError
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (!isSchemaFallbackError(message)) throw error
  }

  const stockResults: Array<Record<string, unknown>> = []

  for (let index = 0; index < withAllocations.length; index += 1) {
    const item = withAllocations[index]
    const movementResult = await processManualMovement(admin, {
      companyId: params.companyId,
      createdBy: params.createdBy,
      creatorName: params.creatorName,
      productId: item.productId,
      movementType: 'entry',
      quantity: item.quantity,
      unitCost: item.effectiveUnitCost,
      notes: item.notes || params.notes || `Achat ${params.purchaseType === 'import' ? 'importation' : 'simple'} - ${params.supplierName}`,
      lotCode: item.lotCode || `${params.purchaseType === 'import' ? 'IMP' : 'ACH'}-${receivedAt}-${String(index + 1).padStart(2, '0')}`,
      referenceType: params.purchaseType === 'import' ? 'purchase_import' : 'purchase_simple',
      referenceNumber: params.referenceNumber || purchaseDocumentId,
    })

    stockResults.push({
      productId: item.productId,
      quantity: item.quantity,
      baseUnitCost: item.unitCost,
      extraAllocated: item.extraAllocated,
      effectiveUnitCost: item.effectiveUnitCost,
      movementId: movementResult.movementId,
    })

    if (purchaseDocumentId) {
      try {
        const product = await loadProduct(admin, params.companyId, item.productId)
        const { error: itemError } = await admin
          .from('purchase_document_items')
          .insert({
            company_id: params.companyId,
            purchase_document_id: purchaseDocumentId,
            product_id: item.productId,
            product_name: product?.name || null,
            quantity: item.quantity,
            base_unit_cost: item.unitCost,
            extra_cost_allocated: item.extraAllocated,
            effective_unit_cost: item.effectiveUnitCost,
            line_total: roundMoney(item.quantity * item.effectiveUnitCost),
            lot_code: item.lotCode,
            notes: item.notes,
          })

        if (itemError) throw itemError
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ''
        if (!isSchemaFallbackError(message)) throw error
      }
    }
  }

  return {
    purchaseDocumentId,
    subtotal,
    extraCostsTotal,
    grandTotal,
    items: stockResults,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as StockPayload
    const kind = String(body.kind || '')
    const companyId = String(body.companyId || '')
    const createdBy = String(body.createdBy || '')
    const creatorEmail = String(body.creatorEmail || '').trim().toLowerCase()

    if (!companyId || (!createdBy && !creatorEmail)) {
      return NextResponse.json({ error: 'Informations manquantes.' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const creatorId = await resolveWorkspaceCreator(admin, createdBy, creatorEmail, companyId)
    if (!creatorId) {
      return NextResponse.json({ error: 'Utilisateur non autorise pour cette entreprise.' }, { status: 403 })
    }

    const creatorName = creatorEmail || 'Utilisateur'

    if (kind === 'manual_movement') {
      const productId = String(body.productId || '')
      const movementType = body.movementType
      const quantity = parsePositiveNumber(body.quantity)
      const unitCost = Math.max(0, parsePositiveNumber(body.unitCost))
      const notes = String(body.notes || '').trim() || null
      const lotCode = String(body.lotCode || '').trim() || null

      if (!productId || !movementType || !['entry', 'adjustment_add', 'adjustment_sub'].includes(movementType) || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Mouvement invalide.' }, { status: 400 })
      }

      const result = await processManualMovement(admin, {
        companyId,
        createdBy: creatorId,
        creatorName,
        productId,
        movementType,
        quantity,
        unitCost: Number.isFinite(unitCost) ? unitCost : 0,
        notes,
        lotCode,
      })

      return NextResponse.json(result)
    }

    if (kind === 'inventory_count') {
      const adjustments = Array.isArray(body.adjustments) ? body.adjustments : []
      let applied = 0

      for (const adjustment of adjustments) {
        const productId = String(adjustment.productId || '')
        const countedQuantity = parsePositiveNumber(adjustment.countedQuantity)
        if (!productId || !Number.isFinite(countedQuantity)) continue

        const product = await loadProduct(admin, companyId, productId)
        if (!product) continue

        const theoretical = Number(product.stock_quantity || 0)
        const diff = countedQuantity - theoretical
        if (diff === 0) continue

        await processManualMovement(admin, {
          companyId,
          createdBy: creatorId,
          creatorName,
          productId,
          movementType: diff > 0 ? 'adjustment_add' : 'adjustment_sub',
          quantity: Math.abs(diff),
          unitCost: Number(product.cost_price || 0),
          notes: `Inventaire physique : compte ${countedQuantity}, theorique ${theoretical}`,
          lotCode: diff > 0 ? `INV-${new Date().toISOString().slice(0, 10)}` : null,
        })

        applied += 1
      }

      return NextResponse.json({ applied })
    }

    if (kind === 'purchase_receipt') {
      const purchaseType = body.purchaseType === 'import' ? 'import' : 'simple'
      const currency = String(body.currency || '').trim().toUpperCase() || 'DZD'
      const supplierName = String(body.supplierName || '').trim()
      const referenceNumber = String(body.referenceNumber || '').trim() || null
      const purchaseDate = String(body.purchaseDate || '').trim() || null
      const notes = String(body.notes || '').trim() || null
      const extraCosts = (Array.isArray(body.extraCosts) ? body.extraCosts : [])
        .map((cost) => ({
          name: String(cost.name || '').trim(),
          amount: Math.max(0, parsePositiveNumber(cost.amount)),
        }))
        .filter((cost) => cost.name && Number.isFinite(cost.amount) && cost.amount > 0)
      const items = (Array.isArray(body.items) ? body.items : [])
        .map((item) => ({
          productId: String(item.productId || ''),
          quantity: parsePositiveNumber(item.quantity),
          unitCost: Math.max(0, parsePositiveNumber(item.unitCost)),
          lotCode: String(item.lotCode || '').trim() || null,
          notes: String(item.notes || '').trim() || null,
        }))
        .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitCost) && item.unitCost >= 0)

      if (!supplierName || items.length === 0) {
        return NextResponse.json({ error: 'Bon d achat incomplet.' }, { status: 400 })
      }

      const result = await processPurchaseReceipt(admin, {
        companyId,
        createdBy: creatorId,
        creatorName,
        purchaseType,
        currency,
        supplierName,
        referenceNumber,
        purchaseDate,
        notes,
        extraCosts,
        items,
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Operation inconnue.' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Operation impossible.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
