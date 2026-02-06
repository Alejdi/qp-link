'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FuturisticLoader } from '@/components/ui/FuturisticLoader'
import { useTheme } from '@/contexts/ThemeContext'

interface Invoice {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  short_code: string
  qr_code: string
  upi_id: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  payment_status?: string
  paid_at?: string | null
  paid_amount?: number | null
}

export default function InvoicesPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { data: session } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to fetch invoices')

      const data = await response.json()
      setInvoices(data.products || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (shortCode: string, id: string) => {
    const url = `${window.location.origin}/pay/${shortCode}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyPaymentLink = async (invoiceId: string, id: string) => {
    const url = `${window.location.origin}/payment/${invoiceId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadQR = (qrCode: string, name: string) => {
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `qr-${name.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openDeleteModal = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setInvoiceToDelete(null)
  }

  const handleDelete = async () => {
    if (!invoiceToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${invoiceToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete invoice')

      // Remove from local state
      setInvoices(invoices.filter(i => i.id !== invoiceToDelete.id))
      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting invoice:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.short_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      const res = await fetch('/api/invoices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          invoiceIds: Array.from(selectedIds)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Bulk action failed')
      }

      const result = await res.json()

      // Refresh invoices list
      await fetchInvoices()

      // Clear selection
      setSelectedIds(new Set())
      setShowBulkMenu(false)

      alert(result.message || 'Action completed successfully')
    } catch (error: any) {
      console.error('Bulk action error:', error)
      alert(error.message || 'Failed to perform bulk action')
    } finally {
      setBulkActionLoading(false)
    }
  }

  if (loading) {
    return <FuturisticLoader fullScreen message="Loading invoices..." />
  }

  return (
    <div className={`min-h-screen px-4 py-8 relative overflow-hidden ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className={`p-2 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}
              title="Back to Dashboard"
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className={`text-3xl sm:text-4xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Invoices</h1>
              <p className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Manage your payment links</p>
            </div>
          </div>
          <Link
            href="/dashboard/create-invoice"
            className={`px-6 py-3 font-semibold rounded-xl transition-all shadow-lg ${isDark ? 'bg-[#21255B] hover:bg-[#2D3270] text-white shadow-[#21255B]/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
          >
            Create New Invoice
          </Link>
        </div>

        {/* Search Bar & Bulk Actions */}
        <div className="mb-6 space-y-4">
          <div className={`backdrop-blur-xl rounded-2xl p-4 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or short code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent border-none outline-none ${isDark ? 'text-white placeholder-[#6B7280]' : 'text-gray-900 placeholder-gray-500'}`}
              />
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className={`backdrop-blur-xl rounded-2xl p-4 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className={`text-sm ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition`}
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    disabled={bulkActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'} disabled:opacity-50`}
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={bulkActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'} disabled:opacity-50`}
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleBulkAction('mark_paid')}
                    disabled={bulkActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} disabled:opacity-50`}
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={() => handleBulkAction('mark_unpaid')}
                    disabled={bulkActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
                  >
                    Mark Unpaid
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${selectedIds.size} invoice(s)? This action cannot be undone.`)) {
                        handleBulkAction('delete')
                      }
                    }}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Select All Checkbox */}
        {filteredInvoices.length > 0 && (
          <div className={`mb-4 backdrop-blur-xl rounded-2xl p-4 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded"
              />
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Select All ({filteredInvoices.length})
              </span>
            </label>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Total Invoices</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoices.length}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#21255B]/20' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Active</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoices.filter(i => i.is_active).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Total Value</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>€{invoices.reduce((sum, i) => sum + i.price, 0).toLocaleString()}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#B8EDFD]/20' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Grid */}
        {filteredInvoices.length === 0 ? (
          <div className={`backdrop-blur-xl rounded-3xl p-12 text-center ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-[#1A1A24]' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {searchQuery ? 'No invoices found' : 'No invoices yet'}
            </h3>
            <p className={`mb-6 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
              {searchQuery ? 'Try adjusting your search query' : 'Create your first invoice to get started'}
            </p>
            {!searchQuery && (
              <Link
                href="/dashboard/create-invoice"
                className={`inline-block px-6 py-3 font-semibold rounded-xl transition-all ${isDark ? 'bg-[#21255B] hover:bg-[#2D3270] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                Create Invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`backdrop-blur-xl rounded-2xl p-6 transition-all ${selectedIds.has(invoice.id) ? (isDark ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-100 border-blue-300') : (isDark ? 'bg-[#1A1A24] border-[#2A2A3C] hover:bg-[#2A2A3C]/50' : 'bg-white border-gray-200 hover:border-gray-300')} border`}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(invoice.id)}
                    onChange={() => toggleSelection(invoice.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1"></div>
                </div>

                {/* Image */}
                {invoice.image_url && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={invoice.image_url}
                      alt={invoice.name}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {invoice.is_active ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                      Inactive
                    </span>
                  )}
                  {invoice.expires_at && isExpired(invoice.expires_at) && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg">
                      Expired
                    </span>
                  )}
                  {invoice.payment_status === 'paid' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg">
                      💰 Paid
                    </span>
                  )}
                  {invoice.payment_status === 'escrow' && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg">
                      🔒 In Escrow
                    </span>
                  )}
                  {invoice.payment_status === 'pending' && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg">
                      ⏳ Pending
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={`text-lg font-bold mb-2 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.name}</h3>

                {/* Description */}
                {invoice.description && (
                  <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>{invoice.description}</p>
                )}

                {/* Price */}
                <div className={`flex items-center justify-between mb-4 pb-4 border-b ${isDark ? 'border-[#2A2A3C]' : 'border-gray-200'}`}>
                  <span className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Price</span>
                  <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>€{invoice.price.toLocaleString()}</span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}>Short Code</span>
                    <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.short_code}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}>Created</span>
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>{formatDate(invoice.created_at)}</span>
                  </div>
                  {invoice.expires_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}>Expires</span>
                      <span className={isExpired(invoice.expires_at) ? 'text-red-400' : (isDark ? 'text-white' : 'text-gray-900')}>
                        {formatDate(invoice.expires_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Payment Link - Show if not paid */}
                  {(!invoice.payment_status || invoice.payment_status === 'unpaid') && (
                    <button
                      onClick={() => copyPaymentLink(invoice.id, invoice.id)}
                      className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      {copiedId === invoice.id ? '✓ Payment Link Copied!' : '💳 Get Payment Link'}
                    </button>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/pay/${invoice.short_code}`}
                      target="_blank"
                      className={`flex-1 py-2 px-4 text-white text-sm font-medium rounded-lg transition-all text-center ${isDark ? 'bg-[#21255B] hover:bg-[#2D3270]' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => copyToClipboard(invoice.short_code, invoice.id)}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                    >
                      {copiedId === invoice.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => downloadQR(invoice.qr_code, invoice.name)}
                      className={`py-2 px-4 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                      title="Download QR Code"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openDeleteModal(invoice)}
                      className="py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                      title="Delete Invoice"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && invoiceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal}></div>

            {/* Modal */}
            <div className="relative max-w-md w-full bg-[#1A1A24] border border-[#2A2A3C] rounded-2xl p-6 shadow-2xl">
              <div className="text-center">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-500/20 mb-4">
                  <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">
                  Delete Invoice
                </h3>
                <p className="text-[#9CA3AF] mb-2">
                  Are you sure you want to delete this invoice?
                </p>
                <p className="text-white font-medium mb-1">"{invoiceToDelete.name}"</p>
                <p className="text-[#9CA3AF] text-sm mb-6">
                  This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
