'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useWallet } from '@/contexts/WalletContext'

interface Transaction {
  id: string
  type: string
  direction: 'in' | 'out'
  amount: number
  fee: number
  netAmount: number
  currency: string
  source: string
  sourceTransactionId: string
  invoice: { name: string; shortId: string } | null
  status: string
  description: string
  metadata: any
  createdAt: string
  completedAt: string
}

export default function TransactionsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { wallet } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState({
    type: '',
    direction: '',
    source: '',
    status: '',
  })

  useEffect(() => {
    fetchTransactions()
  }, [page, filter])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filter.type && { type: filter.type }),
        ...(filter.direction && { direction: filter.direction }),
        ...(filter.source && { source: filter.source }),
        ...(filter.status && { status: filter.status }),
      })

      const res = await fetch(`/api/wallet/transactions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-500/10'
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10'
      case 'failed':
        return 'text-red-500 bg-red-500/10'
      case 'refunded':
        return 'text-purple-500 bg-purple-500/10'
      default:
        return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'stripe':
        return '💳'
      case 'paypal':
        return '🅿️'
      case 'crypto':
        return '₿'
      case 'bank_transfer':
        return '🏦'
      default:
        return '💰'
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard">
                <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF]' : 'hover:bg-gray-100 text-gray-600'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </button>
              </Link>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transactions</h1>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your complete transaction history
            </p>
          </div>

          {/* Balance Summary */}
          <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available Balance</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(wallet?.balance || 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="flex flex-wrap gap-3">
            <select
              value={filter.direction}
              onChange={(e) => { setFilter(f => ({ ...f, direction: e.target.value })); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#2A2A3C] text-white border-[#3A3A4C]' : 'bg-gray-50 text-gray-900 border-gray-200'} border focus:outline-none`}
            >
              <option value="">All Directions</option>
              <option value="in">Money In</option>
              <option value="out">Money Out</option>
            </select>

            <select
              value={filter.type}
              onChange={(e) => { setFilter(f => ({ ...f, type: e.target.value })); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#2A2A3C] text-white border-[#3A3A4C]' : 'bg-gray-50 text-gray-900 border-gray-200'} border focus:outline-none`}
            >
              <option value="">All Types</option>
              <option value="payment_received">Payment Received</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="refund">Refund</option>
            </select>

            <select
              value={filter.source}
              onChange={(e) => { setFilter(f => ({ ...f, source: e.target.value })); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#2A2A3C] text-white border-[#3A3A4C]' : 'bg-gray-50 text-gray-900 border-gray-200'} border focus:outline-none`}
            >
              <option value="">All Sources</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Crypto</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#2A2A3C] text-white border-[#3A3A4C]' : 'bg-gray-50 text-gray-900 border-gray-200'} border focus:outline-none`}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {(filter.direction || filter.type || filter.source || filter.status) && (
              <button
                onClick={() => { setFilter({ type: '', direction: '', source: '', status: '' }); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No transactions yet</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Transactions will appear here when you receive payments
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-4 transition-colors ${isDark ? 'hover:bg-[#2A2A3C]/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      tx.direction === 'in' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {getSourceIcon(tx.source)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {tx.description || tx.type.replace(/_/g, ' ')}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(tx.createdAt)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-[#2A2A3C] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                          {tx.source}
                        </span>
                        {tx.invoice && (
                          <Link href={`/p/${tx.invoice.shortId}`} className="text-xs text-blue-500 hover:underline">
                            Invoice: {tx.invoice.name}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${tx.direction === 'in' ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tx.direction === 'in' ? '+' : '-'}{formatPrice(tx.amount)}
                      </p>
                      {tx.fee > 0 && (
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Fee: {formatPrice(tx.fee)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
            >
              Previous
            </button>
            <span className={`px-4 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
