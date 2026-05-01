export type WorkspaceType = 'cabinet' | 'client'
export type ShellKey = 'admin-rs' | 'cabinet' | 'client'

export type WorkspaceSession = {
  id?: string
  email?: string | null
  full_name?: string | null
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
  const workspaceType = detectWorkspaceType(raw, fallbackType)
  const workspaceRole = String(raw?.workspace_role || raw?.role || (raw?.type === 'owner' ? 'owner' : 'lecteur') || 'lecteur')
  const activeCompanyId = raw?.active_company_id || raw?.company_id || null
  const activeSlug = raw?.active_slug || raw?.slug || null

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

export function getShellRoot(slug: string, shell: ShellKey): string {
  return `/${slug}/${shell}`
}

export function getDefaultShell(session: Partial<WorkspaceSession> | null | undefined): ShellKey {
  if (session?.is_platform_admin) return 'admin-rs'
  return session?.workspace_type === 'cabinet' ? 'cabinet' : 'client'
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
  if (suffixParts[0] === 'admin-platform') {
    const rest = suffixParts.slice(1).join('/')
    return rest ? `/${slug}/admin-rs/${rest}` : `/${slug}/admin-rs`
  }

  const shell = isPlatformAdmin ? 'admin-rs' : (workspaceType === 'cabinet' ? 'cabinet' : 'client')
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
