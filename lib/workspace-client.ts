'use client'

import { supabase } from '@/lib/supabase'
import type { ShellKey } from '@/lib/workspace'

export function getShellFromPathname(pathname: string): ShellKey {
  if (pathname.includes('/admin-rs')) return 'admin-rs'
  if (pathname.includes('/cabinet')) return 'cabinet'
  return 'client'
}

export function isCabinetLikeShell(pathname: string) {
  const shell = getShellFromPathname(pathname)
  return shell === 'cabinet' || shell === 'admin-rs'
}

export async function loadManagedClientWorkspaces(cabinetId: string) {
  const { data, error } = await supabase.rpc('list_managed_client_workspaces', {
    p_cabinet_id: cabinetId,
  })

  if (error) throw error
  return data || []
}

export async function loadOperationalScope(companyId: string, pathname: string) {
  if (!isCabinetLikeShell(pathname)) {
    return {
      mode: 'client' as const,
      companyIds: [companyId],
      companies: [] as any[],
    }
  }

  const companies = await loadManagedClientWorkspaces(companyId)
  const companyIds = companies.map((company: any) => company.id).filter(Boolean)

  return {
    mode: 'cabinet' as const,
    companyIds: companyIds.length > 0 ? companyIds : [companyId],
    companies,
  }
}
