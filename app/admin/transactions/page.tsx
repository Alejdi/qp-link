'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Transaction {
  id: string
  name: string
  description: string
  price: number
  shortId: string
  stripeUrl: string
  createdAt: string
  userId: string
  user?: { name: string; email: string }
  status: string
}

interface TransactionsData {
  transactions: Transaction[]
  summary: {
    totalInvoices: number
    totalInvoiceValue: number
    paidInvoices: number
    pendingInvoices: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminTransactions() {
  const [data, setData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchData()
  }, [page, search])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/transactions?page=${page}&search=${search}`)
      if (res.ok) {
        const transactionsData = await res.json()
        setData(transactionsData)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
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
      case 'paid':
        return 'bg-green-500/10 text-green-400'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400'
      case 'created':
        return 'bg-blue-500/10 text-blue-400'
      case 'failed':
        return 'bg-red-500/10 text-red-400'
      default:
        return 'bg-[#1A1A24] text-[#9CA3AF]'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Transactions</h1>
        <p className="text-[#9CA3AF] mt-1">All invoices and payment activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Total Invoices</p>
          <p className="text-3xl font-bold text-white mt-1">
            {data?.summary.totalInvoices.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Total Invoice Value</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            {formatCurrency(data?.summary.totalInvoiceValue || 0)}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Paid Invoices</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">
            {data?.summary.paidInvoices || 0}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Pending Invoices</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">
            {data?.summary.pendingInvoices || 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by invoice name or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-12 pr-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1A1A24]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Invoice</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Created By</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Created</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-[#9CA3AF]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A24]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">
                    Loading...
                  </td>
                </tr>
              ) : data?.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                data?.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[#1A1A24]/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{transaction.name}</p>
                        <p className="text-[#6B7280] text-sm truncate max-w-[200px]">
                          {transaction.description || 'No description'}
                        </p>
                        <code className="text-xs text-[#6B7280] mt-1">
                          #{transaction.shortId}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/users/${transaction.userId}`} className="hover:text-red-400">
                        <p className="text-white">{transaction.user?.name || 'Unknown'}</p>
                        <p className="text-[#6B7280] text-sm">{transaction.user?.email}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold">
                        {formatCurrency(transaction.price)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#9CA3AF] text-sm">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.stripeUrl && (
                          <a
                            href={transaction.stripeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-sm transition-colors"
                          >
                            Stripe
                          </a>
                        )}
                        <a
                          href={`/p/${transaction.shortId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm transition-colors"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[#6B7280] text-sm">
            Showing {((page - 1) * data.pagination.limit) + 1} to {Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50 hover:bg-[#2A2A3C] transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-[#9CA3AF]">
              Page {page} of {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50 hover:bg-[#2A2A3C] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
