'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { FuturisticLoader } from './FuturisticLoader'

export function PageTransitionLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show loader on initial mount
    setIsLoading(true)

    // Hide loader after content loads
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Show loader when pathname or search params change
    setIsLoading(true)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!isLoading) return null

  return <FuturisticLoader fullScreen />
}
