export type StockMethod = 'fifo' | 'weighted_average' | 'lifo'

export const STOCK_METHODS: Record<StockMethod, {
  label: string
  shortLabel: string
  description: string
  lotStrategy: string
  accountingNote: string
}> = {
  fifo: {
    label: 'FIFO',
    shortLabel: 'FIFO',
    description: 'Premier lot entre, premier lot sorti. Les sorties consomment les lots les plus anciens.',
    lotStrategy: 'Les lots restent distincts et les sorties puisent d abord dans les lots les plus anciens.',
    accountingNote: 'Compatible avec IAS 2 / IFRS pour les stocks interchangeables.',
  },
  weighted_average: {
    label: 'Cout moyen pondere mobile',
    shortLabel: 'CUMP',
    description: 'Chaque nouvel arrivage cree un lot et recalcule le cout moyen du stock restant.',
    lotStrategy: 'Les lots restent traces, mais la valorisation de sortie utilise le cout moyen courant.',
    accountingNote: 'Compatible avec IAS 2 / IFRS. Le nouveau cout moyen est recalcule a chaque arrivage.',
  },
  lifo: {
    label: 'LIFO',
    shortLabel: 'LIFO',
    description: 'Dernier lot entre, premier lot sorti. Les sorties consomment d abord les lots les plus recents.',
    lotStrategy: 'Les lots restent distincts et les sorties puisent d abord dans les lots les plus recents.',
    accountingNote: 'Utile pour pilotage interne, mais non autorise par IAS 2 / IFRS pour la valorisation comptable.',
  },
}

export function normalizeStockMethod(value: unknown): StockMethod {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'weighted_average' || raw === 'cump' || raw === 'pmp') return 'weighted_average'
  if (raw === 'lifo') return 'lifo'
  return 'fifo'
}

export function computeMovingWeightedAverage(
  currentQuantity: number,
  currentUnitCost: number,
  incomingQuantity: number,
  incomingUnitCost: number,
) {
  const baseQty = Number.isFinite(currentQuantity) ? currentQuantity : 0
  const baseCost = Number.isFinite(currentUnitCost) ? currentUnitCost : 0
  const addQty = Number.isFinite(incomingQuantity) ? incomingQuantity : 0
  const addCost = Number.isFinite(incomingUnitCost) ? incomingUnitCost : 0
  const totalQty = baseQty + addQty

  if (totalQty <= 0) return 0

  return ((baseQty * baseCost) + (addQty * addCost)) / totalQty
}
