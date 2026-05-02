import { redirect } from 'next/navigation'
import WorkspaceShell from '@/components/WorkspaceShell'
import { isManagementSlug } from '@/lib/workspace'

type LayoutParams = Promise<{ slug: string }>

export default async function ClientShellLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: LayoutParams
}) {
  const { slug } = await params
  if (isManagementSlug(slug)) {
    redirect(`/${slug}/cabinet`)
  }
  return <WorkspaceShell shell="client">{children}</WorkspaceShell>
}
