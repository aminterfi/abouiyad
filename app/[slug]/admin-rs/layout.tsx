import WorkspaceShell from '@/components/WorkspaceShell'

export default function AdminRsShellLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell shell="admin-rs">{children}</WorkspaceShell>
}
