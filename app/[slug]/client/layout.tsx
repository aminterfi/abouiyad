import WorkspaceShell from '@/components/WorkspaceShell'

export default function ClientShellLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell shell="client">{children}</WorkspaceShell>
}
