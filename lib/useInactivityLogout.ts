'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from './supabase'

const INACTIVITY_LIMIT = 10 * 60 * 1000

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
}

export function useInactivityLogout() {
  const router = useRouter()
  const params = useParams() as { slug?: string }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isMobile()) return

    let timer: any = null

    function logout() {
      localStorage.removeItem('user')
      localStorage.removeItem('subscription')
      supabase.auth.signOut()
      const slug = params?.slug
      if (slug) {
        window.location.href = `/${slug}`
      } else {
        window.location.href = '/'
      }
    }

    function resetTimer() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(logout, INACTIVITY_LIMIT)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [params, router])
}