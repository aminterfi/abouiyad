'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Hook qui écoute les changements sur une ou plusieurs tables Supabase en temps réel
 * Appelle onChange à chaque INSERT/UPDATE/DELETE
 */
export function useRealtime(tables: string[], onChange: () => void) {
  useEffect(() => {
    const channels = tables.map(table =>
      supabase
        .channel(`realtime_${table}_${Date.now()}_${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          onChange()
        })
        .subscribe()
    )
    return () => {
      channels.forEach(c => supabase.removeChannel(c))
    }
  }, [])
}