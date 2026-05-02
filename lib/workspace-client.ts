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

  if (!error) return data || []

  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id,name,slug,workspace_type,parent_cabinet_id')
    .eq('parent_cabinet_id', cabinetId)
    .order('name', { ascending: true })

  if (companyError) throw error

  return (companies || []).map((company: any) => ({
    ...company,
    owner_email: null,
    active_modules: [],
  }))
}

export async function loadOperationalScope(companyId: string, pathname: string) {
  if (!isCabinetLikeShell(pathname)) {
    return {
      mode: 'client' as const,
      companyIds: [companyId],
      companies: [] as any[],
    }
  }

  let companies: any[] = []
  try {
    companies = await loadManagedClientWorkspaces(companyId)
  } catch {
    companies = []
  }
  const companyIds = companies.map((company: any) => company.id).filter(Boolean)

  return {
    mode: 'cabinet' as const,
    companyIds: companyIds.length > 0 ? companyIds : [companyId],
    companies,
  }
}
