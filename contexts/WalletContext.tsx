'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Transaction {
  id: string
  type: string
  direction: 'in' | 'out'
  amount: number
  fee: number
  netAmount: number
  source: string
  status: string
  description: string
  createdAt: string
}

interface WalletData {
  id: string
  balance: number
  pendingBalance: number
  frozenBalance?: number
  currency: string
  isActive: boolean
}

interface WalletStats {
  totalIn: number
  totalOut: number
  transactionCount: number
}

interface EscrowData {
  heldAmount: number
  heldCount: number
}

interface WalletContextType {
  wallet: WalletData | null
  stats: WalletStats | null
  escrow: EscrowData | null
  recentTransactions: Transaction[]
  loading: boolean
  error: string | null
  fetchWallet: () => Promise<void>
  refreshWallet: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [stats, setStats] = useState<WalletStats | null>(null)
  const [escrow, setEscrow] = useState<EscrowData | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWallet = useCallback(async () => {
    if (!session?.user?.id) {
      setWallet(null)
      setStats(null)
      setRecentTransactions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/wallet')

      if (res.ok) {
        const data = await res.json()
        setWallet(data.wallet)
        setStats(data.stats)
        setEscrow(data.escrow || null)
        setRecentTransactions(data.recentTransactions || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to fetch wallet')
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err)
      setError('Failed to fetch wallet')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const refreshWallet = async () => {
    await fetchWallet()
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWallet()
    } else if (status === 'unauthenticated') {
      setWallet(null)
      setStats(null)
      setRecentTransactions([])
      setLoading(false)
    }
  }, [status, fetchWallet])

  return (
    <WalletContext.Provider value={{
      wallet,
      stats,
      escrow,
      recentTransactions,
      loading,
      error,
      fetchWallet,
      refreshWallet,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
