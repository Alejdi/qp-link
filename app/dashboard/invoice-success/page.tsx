'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FuturisticLoader } from '@/components/ui/FuturisticLoader'

export default function InvoiceSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) throw new Error('Failed to fetch invoice')

      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadQR = () => {
    if (!invoice?.qr_code) return

    const link = document.createElement('a')
    link.href = invoice.qr_code
    link.download = `qr-code-${invoice.short_code}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return <FuturisticLoader fullScreen message="Loading invoice details..." />
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invoice not found</h1>
          <Link
            href="/dashboard"
            className="text-[#B8EDFD] hover:text-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pay/${invoice.short_code}`

  return (
    <div className="min-h-screen bg-[#0D0D12] px-4 py-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Invoice Created Successfully!</h1>
          <p className="text-[#9CA3AF]">Your payment link is ready to share</p>
        </div>

        {/* Invoice Details Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl mb-6">
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl">
                <img
                  src={invoice.qr_code}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>

            {/* Payment URL */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Payment Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent"
                />
                <button
                  onClick={() => copyToClipboard(paymentUrl)}
                  className="px-6 py-3 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#21255B]/20"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Product Details */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">Invoice Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Product:</span>
                  <span className="text-white font-medium">{invoice.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Price:</span>
                  <span className="text-white font-medium">€{invoice.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Short Code:</span>
                  <span className="text-white font-medium">{invoice.short_code}</span>
                </div>
                {invoice.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Expires:</span>
                    <span className="text-white font-medium">
                      {(() => {
                        const date = new Date(invoice.expires_at)
                        const day = String(date.getDate()).padStart(2, '0')
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const year = date.getFullYear()
                        const hours = String(date.getHours()).padStart(2, '0')
                        const minutes = String(date.getMinutes()).padStart(2, '0')
                        return `${day}/${month}/${year}, ${hours}:${minutes}`
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
              <button
                onClick={downloadQR}
                className="py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10"
              >
                Download QR
              </button>
              <Link
                href={paymentUrl}
                target="_blank"
                className="py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#21255B]/20 text-center"
              >
                View Page
              </Link>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[#B8EDFD] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
