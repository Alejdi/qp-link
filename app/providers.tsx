'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { CardsProvider } from '@/contexts/CardsContext'
import { WalletProvider } from '@/contexts/WalletContext'
import { PageTransitionLoader } from '@/components/ui/PageTransitionLoader'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
    >
      <ThemeProvider>
        <WalletProvider>
          <CardsProvider>
            <PageTransitionLoader />
            {children}
          </CardsProvider>
        </WalletProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
