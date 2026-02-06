import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useActivityLogger() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const logActivity = useCallback(
    async (action: string, details?: Record<string, any>) => {
      if (!session?.user) return

      try {
        await fetch('/api/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            details,
            page: pathname,
          }),
        })
      } catch (error) {
        console.error('Failed to log activity:', error)
      }
    },
    [session, pathname]
  )

  // Log page view when pathname changes
  useEffect(() => {
    if (session?.user && pathname) {
      logActivity('page_view', { path: pathname })
    }
  }, [pathname, session, logActivity])

  return { logActivity }
}

// Utility function to track button clicks
export function trackClick(action: string, details?: Record<string, any>) {
  fetch('/api/log-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: `click_${action}`,
      details,
      page: window.location.pathname,
    }),
  }).catch(console.error)
}

// Utility function to track form submissions
export function trackFormSubmit(formName: string, details?: Record<string, any>) {
  fetch('/api/log-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: `submit_${formName}`,
      details,
      page: window.location.pathname,
    }),
  }).catch(console.error)
}
