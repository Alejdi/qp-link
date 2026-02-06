'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from '@/contexts/ThemeContext'
import { FuturisticLoader } from '@/components/ui/FuturisticLoader'
import { ImageCarousel } from '@/components/ui/ImageCarousel'
import Link from 'next/link'

interface Invoice {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  images?: string[] | null
  short_code: string
  qr_code: string
  upi_id: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  payment_status?: string
  paid_at?: string | null
  paid_amount?: number | null
  buyer_email?: string | null
  buyer_name?: string | null
  transaction_id?: string | null
}

export default function InvoiceDetailPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch invoice')

      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPaymentLink = async () => {
    if (!invoice) return
    const url = `${window.location.origin}/payment/${invoice.id}`

    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyPublicLink = async () => {
    if (!invoice) return
    const url = `${window.location.origin}/pay/${invoice.short_code}`

    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadQR = () => {
    if (!invoice) return
    const link = document.createElement('a')
    link.href = invoice.qr_code
    link.download = `qr-${invoice.name.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const isExpired = () => {
    if (!invoice?.expires_at) return false
    return new Date(invoice.expires_at) < new Date()
  }

  // Get images array - prioritize 'images' field, fallback to 'image_url'
  const getInvoiceImages = (): string[] => {
    if (!invoice) return []
    if (invoice.images && invoice.images.length > 0) {
      return invoice.images
    }
    if (invoice.image_url) {
      return [invoice.image_url]
    }
    return []
  }

  if (loading) {
    return <FuturisticLoader fullScreen message="Loading invoice details..." />
  }

  if (!invoice) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
        <div className={`text-center p-8 rounded-2xl ${isDark ? 'bg-[#1A1A24]' : 'bg-white'}`}>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Invoice not found</p>
          <Link href="/dashboard/invoices" className="text-blue-500 hover:underline mt-4 inline-block">
            Back to Invoices
          </Link>
        </div>
      </div>
    )
  }

  const invoiceImages = getInvoiceImages()

  return (
    <div className={`min-h-screen px-4 py-8 relative overflow-hidden ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className={`p-2 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Invoice Details</h1>
            <p className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>View and manage invoice</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Info Card */}
            <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {invoice.is_active ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg">
                    Inactive
                  </span>
                )}
                {invoice.expires_at && isExpired() && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-lg">
                    Expired
                  </span>
                )}
                {invoice.payment_status === 'paid' && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg">
                    💰 Paid
                  </span>
                )}
                {invoice.payment_status === 'escrow' && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg">
                    🔒 In Escrow
                  </span>
                )}
                {invoice.payment_status === 'pending' && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-lg">
                    ⏳ Pending Payment
                  </span>
                )}
              </div>

              {/* Image Carousel */}
              {invoiceImages.length > 0 && (
                <div className="mb-6">
                  <ImageCarousel images={invoiceImages} alt={invoice.name} />
                </div>
              )}

              {/* Title and Description */}
              <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {invoice.name}
              </h2>
              {invoice.description && (
                <p className={`text-base mb-6 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
                  {invoice.description}
                </p>
              )}

              {/* Price */}
              <div className={`flex items-center justify-between p-4 rounded-xl mb-6 ${isDark ? 'bg-[#21255B]/20' : 'bg-blue-50'}`}>
                <span className={`text-lg font-medium ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Price</span>
                <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>€{invoice.price.toLocaleString()}</span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Short Code</p>
                  <p className={`font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.short_code}</p>
                </div>
                <div>
                  <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Created</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatDate(invoice.created_at)}</p>
                </div>
                {invoice.expires_at && (
                  <div>
                    <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Expires</p>
                    <p className={`font-medium ${isExpired() ? 'text-red-400' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                      {formatDate(invoice.expires_at)}
                    </p>
                  </div>
                )}
                {invoice.paid_at && (
                  <div>
                    <p className={`text-sm mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Paid At</p>
                    <p className={`font-medium text-green-400`}>{formatDate(invoice.paid_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information (if paid) */}
            {invoice.payment_status === 'paid' && (
              <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Payment Information</h3>
                <div className="space-y-3">
                  {invoice.buyer_name && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Buyer Name</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.buyer_name}</span>
                    </div>
                  )}
                  {invoice.buyer_email && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Buyer Email</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.buyer_email}</span>
                    </div>
                  )}
                  {invoice.paid_amount && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Amount Paid</span>
                      <span className={`font-bold text-green-400`}>€{invoice.paid_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.transaction_id && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Transaction ID</span>
                      <span className={`font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{invoice.transaction_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>QR Code</h3>
              <div className="bg-white p-4 rounded-xl mb-4">
                <img
                  src={invoice.qr_code}
                  alt="QR Code"
                  className="w-full"
                />
              </div>
              <button
                onClick={downloadQR}
                className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
              >
                Download QR Code
              </button>
            </div>

            {/* Actions */}
            <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
              <div className="space-y-3">
                {/* Checkout Button - Show if unpaid or pending */}
                {(!invoice.payment_status || invoice.payment_status === 'unpaid' || invoice.payment_status === 'pending') && (
                  <Link
                    href={`/payment/${invoice.id}`}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-center font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Proceed to Checkout
                  </Link>
                )}

                <button
                  onClick={copyPaymentLink}
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all"
                >
                  {copiedLink ? '✓ Payment Link Copied!' : '💳 Copy Payment Link'}
                </button>

                <button
                  onClick={copyPublicLink}
                  className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  {copiedLink ? 'Copied!' : 'Copy Public Link'}
                </button>

                <Link
                  href={`/pay/${invoice.short_code}`}
                  target="_blank"
                  className={`block w-full py-2 px-4 text-sm font-medium rounded-lg transition-all text-center ${isDark ? 'bg-[#21255B] hover:bg-[#2D3270] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  View Public Page
                </Link>
              </div>
            </div>

            {/* UPI ID */}
            <div className={`backdrop-blur-xl rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>UPI ID</h3>
              <p className={`text-sm font-mono break-all ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>{invoice.upi_id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
