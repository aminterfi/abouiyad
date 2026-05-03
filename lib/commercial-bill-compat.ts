const OPTIONAL_BILL_COLUMNS = new Set([
  'document_type',
  'commercial_status',
  'source_bill_id',
  'client_declared',
  'client_declared_at',
  'client_declaration_note',
  'client_declared_by',
  'invoice_policy',
])

const OPTIONAL_BILL_ITEM_COLUMNS = new Set([
  'ordered_quantity',
  'delivered_quantity',
  'source_item_id',
])

function readMissingColumn(error: any): string | null {
  const message = String(error?.message || '')
  const schemaCache = message.match(/Could not find the '([^']+)' column/)
  if (schemaCache?.[1]) return schemaCache[1]
  const postgres = message.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)
  if (postgres?.[1]) return postgres[1]
  return null
}

function stripMissingColumn<T extends Record<string, any>>(payload: T, column: string) {
  if (!(column in payload)) return payload
  const next = { ...payload }
  delete next[column]
  return next
}

async function withColumnFallback<T extends Record<string, any>>(
  run: (payload: T) => Promise<{ data?: any; error?: any }>,
  initialPayload: T,
  allowedColumns: Set<string>,
): Promise<{ data?: any; error?: any; payload: T }> {
  let payload = { ...initialPayload }

  for (let attempt = 0; attempt < allowedColumns.size + 1; attempt += 1) {
    const result = await run(payload)
    if (!result.error) {
      return { ...result, payload }
    }

    const missingColumn = readMissingColumn(result.error)
    if (!missingColumn || !allowedColumns.has(missingColumn)) {
      return { ...result, payload }
    }

    payload = stripMissingColumn(payload, missingColumn)
  }

  return { error: new Error('Commercial column fallback failed'), payload }
}

export function normalizeCommercialBill(bill: any) {
  return {
    ...bill,
    document_type: bill?.document_type || 'invoice',
    commercial_status: bill?.commercial_status || 'issued',
    client_declared: bill?.client_declared === true,
    client_declaration_note: bill?.client_declaration_note || '',
    invoice_policy: bill?.invoice_policy || 'ordered',
  }
}

export function normalizeCommercialBillItem(item: any) {
  return {
    ...item,
    ordered_quantity: item?.ordered_quantity ?? item?.quantity ?? 0,
    delivered_quantity: item?.delivered_quantity ?? item?.quantity ?? 0,
  }
}

export async function insertBillWithFallback(supabase: any, payload: Record<string, any>) {
  return withColumnFallback(
    (nextPayload) => supabase.from('bills').insert(nextPayload).select().single(),
    payload,
    OPTIONAL_BILL_COLUMNS,
  )
}

export async function updateBillWithFallback(supabase: any, id: string, payload: Record<string, any>) {
  return withColumnFallback(
    (nextPayload) => supabase.from('bills').update(nextPayload).eq('id', id).select().single(),
    payload,
    OPTIONAL_BILL_COLUMNS,
  )
}

export async function insertBillItemsWithFallback(supabase: any, payload: Record<string, any>[]) {
  const rows = payload.map((row) => ({ ...row }))
  let currentRows = rows

  for (let attempt = 0; attempt < OPTIONAL_BILL_ITEM_COLUMNS.size + 1; attempt += 1) {
    const result = await supabase.from('bill_items').insert(currentRows)
    if (!result.error) return { ...result, rows: currentRows }

    const missingColumn = readMissingColumn(result.error)
    if (!missingColumn || !OPTIONAL_BILL_ITEM_COLUMNS.has(missingColumn)) {
      return { ...result, rows: currentRows }
    }

    currentRows = currentRows.map((row) => stripMissingColumn(row, missingColumn))
  }

  return { error: new Error('Commercial item fallback failed'), rows: currentRows }
}
