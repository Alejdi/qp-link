'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Package, Truck, AlertTriangle } from 'lucide-react'

interface Escrow {
  id: string
  amount: number
  currency: string
  status: string
  sellerConfirmed: boolean
  buyerConfirmed: boolean
  trackingNumber: string | null
  trackingCarrier: string | null
  shippedAt: string | null
  autoReleaseAt: string
  invoice: {
    name: string
    short_code: string
  }
  createdAt: string
}

export default function EscrowConfirmPage() {
  const searchParams = useSearchParams()
  const escrowId = searchParams.get('id')
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const [escrow, setEscrow] = useState<Escrow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'confirm' | 'dispute' | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (escrowId && email && token) {
      fetchEscrow()
    } else {
      setError('Invalid confirmation link')
      setLoading(false)
    }
  }, [escrowId, email, token])

  const fetchEscrow = async () => {
    try {
      const res = await fetch(
        `/api/escrow/confirm?id=${escrowId}&email=${encodeURIComponent(email!)}&token=${token}`
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load escrow')
      }

      const data = await res.json()
      setEscrow(data.escrow)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReceipt = async () => {
    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/escrow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId,
          email,
          token,
          action: 'confirm_received',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to confirm receipt')
      }

      const data = await res.json()
      setSuccess(true)
      setAction('confirm')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      setError('Please provide a reason for the dispute')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/escrow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId,
          email,
          token,
          action: 'open_dispute',
          reason: disputeReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to open dispute')
      }

      setSuccess(true)
      setAction('dispute')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const getDaysUntilAutoRelease = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading escrow details...</p>
        </div>
      </div>
    )
  }

  if (error && !escrow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Link</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          {action === 'confirm' ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Receipt Confirmed!</h2>
              <p className="text-gray-400 mb-6">
                Thank you for confirming receipt. The funds have been released to the seller.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Dispute Opened</h2>
              <p className="text-gray-400 mb-6">
                Your dispute has been submitted. Our team will review it and contact you soon.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!escrow) return null

  // Already confirmed or disputed
  if (escrow.status !== 'held') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Escrow {escrow.status}</h2>
          <p className="text-gray-400">This escrow has already been {escrow.status}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Confirm Your Order</h1>
          <p className="text-gray-400">
            Please confirm that you have received your order for {escrow.invoice.name}
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Order Details</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Invoice</span>
              <span className="text-white font-medium">#{escrow.invoice.short_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Product</span>
              <span className="text-white font-medium">{escrow.invoice.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount Paid</span>
              <span className="text-white font-bold text-lg">
                {escrow.currency === 'EUR' ? '€' : '$'}{escrow.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Order Date</span>
              <span className="text-white">
                {new Date(escrow.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Tracking Info */}
        {escrow.trackingNumber && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Tracking Information</h3>
            </div>
            <p className="text-white mb-1">
              <span className="text-gray-400">Carrier:</span> {escrow.trackingCarrier}
            </p>
            <p className="text-white mb-1">
              <span className="text-gray-400">Tracking #:</span> {escrow.trackingNumber}
            </p>
            {escrow.shippedAt && (
              <p className="text-sm text-gray-400 mt-2">
                Shipped on {new Date(escrow.shippedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Auto-release notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-400">
            If you don't respond, funds will automatically be released to the seller in{' '}
            {getDaysUntilAutoRelease(escrow.autoReleaseAt)} days.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">What would you like to do?</h3>

          {/* Confirm Receipt Button */}
          <button
            onClick={handleConfirmReceipt}
            disabled={processing || escrow.buyerConfirmed}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 rounded-lg mb-4 transition-all flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : escrow.buyerConfirmed ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Already Confirmed
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirm I Received the Order
              </>
            )}
          </button>

          {/* Dispute Section */}
          {!escrow.buyerConfirmed && (
            <details className="bg-gray-700/50 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                I have an issue with my order
              </summary>
              <div className="mt-4">
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Please describe the issue with your order..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white mb-3 min-h-[100px]"
                  disabled={processing}
                />
                <button
                  onClick={handleOpenDispute}
                  disabled={processing || !disputeReason.trim()}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  {processing ? 'Opening Dispute...' : 'Open Dispute'}
                </button>
              </div>
            </details>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By confirming receipt, you authorize the release of funds to the seller.
        </p>
      </div>
    </div>
  )
}
