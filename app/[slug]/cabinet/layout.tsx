import { redirect } from 'next/navigation'
import WorkspaceShell from '@/components/WorkspaceShell'
import { isManagementSlug } from '@/lib/workspace'

type LayoutParams = Promise<{ slug: string }>

export default async function CabinetShellLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: LayoutParams
}) {
  const { slug } = await params
  if (!isManagementSlug(slug)) {
    redirect(`/${slug}/client`)
  }
  return <WorkspaceShell shell="cabinet">{children}</WorkspaceShell>
}
