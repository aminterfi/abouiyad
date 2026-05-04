'use client'

import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIosBrowser() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)
}

export default function PwaClient({ slug }: { slug: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  const storageKey = useMemo(() => `pwa-prompt-dismissed:${slug}`, [slug])

  useEffect(() => {
    setInstalled(isStandaloneMode())
    setDismissed(localStorage.getItem(storageKey) === '1')

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch(() => {
        // Silent by design: PWA support is progressive.
      })
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function onAppInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
      setShowIosHelp(false)
      localStorage.setItem(storageKey, '1')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [storageKey])

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
        setDismissed(true)
        localStorage.setItem(storageKey, '1')
      }
      return
    }

    if (isIosBrowser()) {
      setShowIosHelp(true)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(storageKey, '1')
  }

  const canShow = !installed && !dismissed && (installPrompt || isIosBrowser())

  if (!canShow) return null

  return (
    <div className="pwa-prompt" role="dialog" aria-live="polite" aria-label="Installer l'application">
      <div className="pwa-prompt-copy">
        <div className="pwa-prompt-title">Installer l&apos;app</div>
        <div className="pwa-prompt-text">
          {showIosHelp
            ? 'Sur iPhone ou iPad: ouvrez Partager puis ajoutez sur l’ecran d’accueil.'
            : 'Ajoutez cette application a l’ecran d’accueil pour un acces plus rapide.'}
        </div>
      </div>
      <div className="pwa-prompt-actions">
        {!showIosHelp ? (
          <button type="button" className="pwa-prompt-button primary" onClick={handleInstall}>
            Installer
          </button>
        ) : null}
        <button type="button" className="pwa-prompt-button ghost" onClick={handleDismiss}>
          {showIosHelp ? 'Compris' : 'Plus tard'}
        </button>
      </div>
    </div>
  )
}
