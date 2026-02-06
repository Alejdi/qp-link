'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard, Lock, Loader2 } from 'lucide-react'

interface Invoice {
  id: string
  short_code: string
  name: string
  description: string
  price: number
  payment_status: string
  user: {
    name: string
    email: string
  }
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.invoiceId as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/products/${invoiceId}`)

      if (!res.ok) {
        throw new Error('Invoice not found')
      }

      const data = await res.json()
      const product = data.product

      // Transform Supabase response to match our interface
      const invoice: Invoice = {
        id: product.id,
        short_code: product.short_code,
        name: product.name,
        description: product.description,
        price: product.price,
        payment_status: product.payment_status,
        user: {
          name: product.users?.name || '',
          email: product.users?.email || ''
        }
      }

      setInvoice(invoice)
      setLoading(false)
    } catch (err: any) {
      console.error('FETCH ERROR:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          useEscrow: true, // Always use escrow for now
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create checkout')
      }

      const { url } = await res.json()

      // Redirect to Stripe checkout
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invoice Not Found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-400 flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </button>
        </motion.div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Already paid
  if (invoice.payment_status === 'paid' || invoice.payment_status === 'escrow') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Already Paid</h2>
          <p className="text-gray-400 mb-6">This invoice has already been paid.</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-400 flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </button>
        </motion.div>
      </div>
    )
  }

  const stripeFee = invoice.price * 0.029 + 0.30
  const platformFee = invoice.price * 0.02
  const totalFees = stripeFee + platformFee

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-1">Payment Checkout</h1>
          <p className="text-blue-100 text-sm">Invoice #{invoice.short_code}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Invoice Details */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">{invoice.name}</h2>
            {invoice.description && (
              <p className="text-gray-400 mb-4">{invoice.description}</p>
            )}

            <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Seller</span>
                <span className="text-white">{invoice.user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Seller Email</span>
                <span className="text-white">{invoice.user.email}</span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gray-700/30 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal</span>
              <span>€{invoice.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Processing Fees</span>
              <span>€{totalFees.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-white">
                <span>Total</span>
                <span>€{invoice.price.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Seller receives: €{(invoice.price - totalFees).toFixed(2)} (after fees)
              </p>
            </div>
          </div>

          {/* Escrow Notice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium mb-1">Buyer Protection</h3>
                <p className="text-sm text-gray-300">
                  Your payment will be held securely in escrow until you confirm receipt of the product/service.
                  The seller only receives funds after you confirm or after 14 days if you don't respond.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay €{invoice.price.toFixed(2)} with Stripe
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Secured by Stripe. Your payment information is encrypted and secure.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
