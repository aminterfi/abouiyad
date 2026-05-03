'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type UseRealtimeOptions = {
  enabled?: boolean
  intervalMs?: number
  deps?: Array<string | number | boolean | null | undefined>
}

export function useRealtime(
  tables: string[],
  onChange: () => void,
  options?: UseRealtimeOptions,
) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  const enabled = options?.enabled !== false
  const intervalMs = options?.intervalMs || 4000
  const extraDeps = options?.deps || []

  useEffect(() => {
    if (!enabled || tables.length === 0) return

    const run = () => callbackRef.current()
    const channels = tables.map((table) =>
      supabase
        .channel(`realtime_${table}_${Date.now()}_${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, run)
        .subscribe(),
    )

    const timer = window.setInterval(run, intervalMs)
    const handleFocus = () => run()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      channels.forEach((channel) => supabase.removeChannel(channel))
    }
  }, [enabled, intervalMs, tables.join('|'), ...extraDeps])
}
