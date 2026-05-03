'use client'

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Cabinet API error')
  }
  return data
}

export function getSlugFromPathname(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] || 'rs'
}

export async function fetchCabinetSummary(slug: string) {
  const response = await fetch(`/api/cabinet/operational?kind=summary&slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  return parseJson(response)
}

export async function fetchCabinetClients(slug: string) {
  const response = await fetch(`/api/cabinet/operational?kind=clients&slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  return parseJson(response)
}

export async function fetchCabinetDemandes(slug: string) {
  const response = await fetch(`/api/cabinet/operational?kind=demandes&slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  return parseJson(response)
}

export async function fetchCabinetTickets(slug: string) {
  const response = await fetch(`/api/cabinet/operational?kind=tickets&slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  return parseJson(response)
}

export async function updateCabinetOperationalItem(
  slug: string,
  kind: 'demande' | 'ticket',
  id: string,
  payload: Record<string, any>,
) {
  const response = await fetch('/api/cabinet/operational', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, kind, id, payload }),
  })
  return parseJson(response)
}
