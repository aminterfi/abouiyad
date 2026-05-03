'use client'

export type WorkspaceEmailPayload = {
  scope: 'cabinet' | 'client'
  kind: 'demande' | 'ticket'
  action: 'created' | 'status_updated'
  companyId: string
  title: string
  status?: string | null
  actorName?: string | null
}

export async function sendWorkspaceEmailNotification(payload: WorkspaceEmailPayload) {
  try {
    await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Email delivery should not block the product flow.
  }
}
