export type CommercialDocumentType = 'invoice' | 'quote' | 'purchase_order' | 'delivery_note'

export const COMMERCIAL_DOCUMENT_TYPES: Array<{
  key: CommercialDocumentType
  label: string
  shortLabel: string
  accent: string
  light: string
  description: string
}> = [
  {
    key: 'quote',
    label: 'Devis',
    shortLabel: 'DEVIS',
    accent: '#7C3AED',
    light: 'rgba(124,58,237,0.12)',
    description: 'Proposition commerciale avant validation client.',
  },
  {
    key: 'purchase_order',
    label: 'Bon de commande',
    shortLabel: 'BC',
    accent: '#2563EB',
    light: 'rgba(37,99,235,0.12)',
    description: 'Commande confirmee a executer.',
  },
  {
    key: 'delivery_note',
    label: 'Bon de livraison',
    shortLabel: 'BL',
    accent: '#0D9488',
    light: 'rgba(13,148,136,0.12)',
    description: 'Trace des quantites reellement livrees.',
  },
  {
    key: 'invoice',
    label: 'Facture',
    shortLabel: 'FACTURE',
    accent: '#D97706',
    light: 'rgba(217,119,6,0.12)',
    description: 'Document comptable et recouvrement.',
  },
]

export const COMMERCIAL_DOCUMENT_MAP = Object.fromEntries(
  COMMERCIAL_DOCUMENT_TYPES.map((item) => [item.key, item]),
) as Record<CommercialDocumentType, (typeof COMMERCIAL_DOCUMENT_TYPES)[number]>

export function normalizeCommercialDocumentType(value: string | null | undefined): CommercialDocumentType {
  if (value === 'quote' || value === 'purchase_order' || value === 'delivery_note' || value === 'invoice') {
    return value
  }
  return 'invoice'
}

export function getCommercialDocumentMeta(value: string | null | undefined) {
  return COMMERCIAL_DOCUMENT_MAP[normalizeCommercialDocumentType(value)]
}

export function getDeclarationMeta(declared: boolean | null | undefined) {
  return declared
    ? {
        label: 'Declare',
        color: '#15803D',
        bg: 'rgba(22,163,74,0.12)',
      }
    : {
        label: 'Non declare',
        color: '#B45309',
        bg: 'rgba(245,158,11,0.12)',
      }
}

export function getNextCommercialDocumentTypes(type: string | null | undefined): CommercialDocumentType[] {
  const normalized = normalizeCommercialDocumentType(type)
  if (normalized === 'quote') return ['purchase_order', 'invoice']
  if (normalized === 'purchase_order') return ['delivery_note', 'invoice']
  if (normalized === 'delivery_note') return ['invoice']
  return []
}

export function getDefaultCommercialStatus(type: string | null | undefined) {
  const normalized = normalizeCommercialDocumentType(type)
  if (normalized === 'quote') return 'draft'
  if (normalized === 'purchase_order') return 'confirmed'
  if (normalized === 'delivery_note') return 'delivered'
  return 'issued'
}

export function getDocumentReferenceLabel(type: string | null | undefined) {
  const normalized = normalizeCommercialDocumentType(type)
  if (normalized === 'quote') return 'Reference devis'
  if (normalized === 'purchase_order') return 'Reference commande'
  if (normalized === 'delivery_note') return 'Reference livraison'
  return 'Numero facture'
}
