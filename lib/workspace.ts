import { BUSINESS_MODULES } from '@/lib/business-modules'

export type WorkspaceType = 'cabinet' | 'client'
export type ShellKey = 'admin-rs' | 'cabinet' | 'client'
export const MANAGEMENT_SLUG = 'rs'

export type WorkspaceSession = {
  id?: string
  email?: string | null
  full_name?: string | null
  phone?: string | null
  role?: string | null
  type?: string | null
  slug?: string | null
  company_id?: string | null
  company_name?: string | null
  is_platform_admin?: boolean
  nb_companies?: number
  workspace_type: WorkspaceType
  workspace_role: string
  parent_cabinet_id: string | null
  active_company_id: string | null
  active_slug: string | null
}

export const DEFAULT_CLIENT_MODULES = BUSINESS_MODULES

export function isManagementSlug(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === MANAGEMENT_SLUG
}

export function enforceWorkspaceTypeForSlug(
  slug: string | null | undefined,
  fallback: WorkspaceType = 'client',
): WorkspaceType {
  if (!slug) return fallback
  return isManagementSlug(slug) ? 'cabinet' : 'client'
}

export function detectWorkspaceType(value: any, fallback: WorkspaceType = 'client'): WorkspaceType {
  const raw = String(
    value?.workspace_type ??
    value?.company_workspace_type ??
    value?.type_workspace ??
    ''
  ).trim().toLowerCase()

  if (raw === 'cabinet' || raw === 'client') return raw
  if (value?.parent_cabinet_id) return 'client'
  return fallback
}

export function detectShellFromPath(pathname: string | null | undefined): ShellKey | null {
  if (!pathname) return null
  if (pathname.includes('/admin-rs')) return 'admin-rs'
  if (pathname.includes('/cabinet')) return 'cabinet'
  if (pathname.includes('/client')) return 'client'
  return null
}

export function normalizeWorkspaceSession(raw: any, fallbackType: WorkspaceType = 'client'): WorkspaceSession {
  const activeSlug = raw?.active_slug || raw?.slug || null
  const workspaceType = enforceWorkspaceTypeForSlug(activeSlug, detectWorkspaceType(raw, fallbackType))
  const workspaceRole = String(raw?.workspace_role || raw?.role || (raw?.type === 'owner' ? 'owner' : 'lecteur') || 'lecteur')
  const activeCompanyId = raw?.active_company_id || raw?.company_id || null

  return {
    ...raw,
    workspace_type: workspaceType,
    workspace_role: workspaceRole,
    parent_cabinet_id: raw?.parent_cabinet_id || null,
    active_company_id: activeCompanyId,
    active_slug: activeSlug,
    company_id: activeCompanyId,
    slug: activeSlug,
    is_platform_admin: raw?.is_platform_admin === true,
  }
}

export function getActiveCompanyId(session: Partial<WorkspaceSession> | any): string {
  return String(session?.active_company_id || session?.company_id || '')
}

export function buildWorkspaceSessionForCompany(currentSession: any, company: any): WorkspaceSession {
  return normalizeWorkspaceSession({
    ...currentSession,
    company_id: company.company_id || company.id,
    company_name: company.company_name || company.name,
    slug: company.slug,
    workspace_type: detectWorkspaceType(company),
    workspace_role: company.workspace_role || company.role || currentSession?.workspace_role || currentSession?.role || 'owner',
    parent_cabinet_id: company.parent_cabinet_id || null,
    active_company_id: company.company_id || company.id,
    active_slug: company.slug,
  })
}

export function getShellRoot(slug: string, shell: ShellKey): string {
  return `/${slug}/${shell}`
}

export function getDefaultShell(session: Partial<WorkspaceSession> | null | undefined, slug?: string | null): ShellKey {
  const activeSlug = slug || session?.active_slug || session?.slug
  return isManagementSlug(activeSlug) ? 'cabinet' : 'client'
}

export function getDefaultWorkspacePath(session: Partial<WorkspaceSession> | null | undefined, slug?: string | null): string {
  const nextSlug = slug || session?.active_slug || session?.slug
  if (!nextSlug) return '/'
  return getShellRoot(nextSlug, getDefaultShell(session))
}

export function getLegacyDashboardRedirect(
  slug: string,
  suffixParts: string[],
  workspaceType: WorkspaceType,
  isPlatformAdmin = false,
): string {
  void workspaceType
  void isPlatformAdmin

  if (suffixParts[0] === 'admin-platform') {
    const rest = suffixParts.slice(1).join('/')
    if (!isManagementSlug(slug)) {
      return `/${slug}/client`
    }
    return rest ? `/${slug}/admin-rs/${rest}` : `/${slug}/admin-rs`
  }

  const shell = isManagementSlug(slug) ? 'cabinet' : 'client'
  const rest = suffixParts.join('/')
  return rest ? `/${slug}/${shell}/${rest}` : `/${slug}/${shell}`
}

export function readWorkspaceSession(fallbackType: WorkspaceType = 'client'): WorkspaceSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('user')
  if (!raw) return null
  try {
    return normalizeWorkspaceSession(JSON.parse(raw), fallbackType)
  } catch {
    return null
  }
}

export function writeWorkspaceSession(session: any, fallbackType: WorkspaceType = 'client') {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('user', JSON.stringify(normalizeWorkspaceSession(session, fallbackType)))
}
