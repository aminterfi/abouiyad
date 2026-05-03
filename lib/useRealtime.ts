'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type UseRealtimeOptions = {
  enabled?: boolean
  intervalMs?: number
  deps?: Array<string | number | boolean | null | undefined>
  throttleMs?: number
}

export function useRealtime(
  tables: string[],
  onChange: () => void | Promise<void>,
  options?: UseRealtimeOptions,
) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const lastRunRef = useRef(0)

  const enabled = options?.enabled !== false
  const intervalMs = options?.intervalMs || 15000
  const throttleMs = options?.throttleMs || 700
  const extraDeps = options?.deps || []

  useEffect(() => {
    if (!enabled || tables.length === 0) return

    const channelReady = tables.map(() => false)

    const run = async (force = false) => {
      const now = Date.now()
      if (!force && now - lastRunRef.current < throttleMs) return
      if (inFlightRef.current) {
        queuedRef.current = true
        return
      }

      inFlightRef.current = true
      lastRunRef.current = now
      try {
        await callbackRef.current()
      } finally {
        inFlightRef.current = false
        if (queuedRef.current) {
          queuedRef.current = false
          window.setTimeout(() => {
            void run(true)
          }, 0)
        }
      }
    }

    const hasActiveRealtime = () => channelReady.some(Boolean)

    const channels = tables.map((table, index) =>
      supabase
        .channel(`realtime_${table}_${Date.now()}_${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          void run()
        })
        .subscribe((status) => {
          channelReady[index] = status === 'SUBSCRIBED'
        }),
    )

    const timer = window.setInterval(() => {
      const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
      if (!isVisible || !hasActiveRealtime()) {
        void run()
      }
    }, intervalMs)

    const handleFocus = () => {
      void run(true)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void run(true)
      }
    }

    void run(true)
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
