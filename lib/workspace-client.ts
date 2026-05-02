'use client'

import { supabase } from '@/lib/supabase'
import { isManagementSlug, type ShellKey } from '@/lib/workspace'

export function getShellFromPathname(pathname: string): ShellKey {
  if (pathname.includes('/admin-rs')) return 'admin-rs'
  if (pathname.includes('/cabinet')) return 'cabinet'
  return 'client'
}

export function isCabinetLikeShell(pathname: string) {
  const shell = getShellFromPathname(pathname)
  return shell === 'cabinet' || shell === 'admin-rs'
}

function getSlugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts[0] || ''
}

async function loadAllCompaniesForManagementCabinet(cabinetId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug')
    .neq('id', cabinetId)
    .neq('slug', 'rs')
    .order('name', { ascending: true })

  if (error) throw error

  return (data || []).map((company: any) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    workspace_type: 'client',
    parent_cabinet_id: cabinetId,
    owner_email: null,
    active_modules: [],
  }))
}

export async function loadManagedClientWorkspaces(cabinetId: string, cabinetSlug?: string) {
  if (isManagementSlug(cabinetSlug)) {
    return loadAllCompaniesForManagementCabinet(cabinetId)
  }

  const { data, error } = await supabase.rpc('list_managed_client_workspaces', {
    p_cabinet_id: cabinetId,
  })

  if (!error && (data || []).length > 0) return data || []

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
    companies = await loadManagedClientWorkspaces(companyId, getSlugFromPathname(pathname))
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
