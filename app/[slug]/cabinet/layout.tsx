import WorkspaceShell from '@/components/WorkspaceShell'

export default function CabinetShellLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell shell="cabinet">{children}</WorkspaceShell>
}
