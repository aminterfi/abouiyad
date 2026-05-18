export const BUSINESS_MODULES = [
  'dashboard',
  'billing',
  'clients',
  'payments',
  'catalog',
  'stock',
  'suppliers',
  'expenses',
  'tickets',
  'service_requests',
  'documents',
  'users',
  'settings',
] as const

export type BusinessModuleKey = typeof BUSINESS_MODULES[number]
