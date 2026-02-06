'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ArrowRight, Lock } from 'lucide-react'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!loading && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
    if (countdown === 0) {
      router.push('/dashboard')
    }
  }, [loading, countdown, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Payment Successful!</h1>

        <p className="text-gray-400 mb-6">
          Your payment has been received and is now held securely in escrow.
        </p>

        <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-medium">What happens next?</h3>
          </div>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex gap-2">
              <span className="text-blue-400">1.</span>
              <span>The seller will be notified and prepare your order</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">2.</span>
              <span>You'll receive tracking information when shipped</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">3.</span>
              <span>Confirm receipt to release funds to the seller</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">4.</span>
              <span>If you don't respond in 14 days, funds auto-release</span>
            </li>
          </ul>
        </div>

        {sessionId && (
          <p className="text-xs text-gray-500 mb-4">
            Session ID: {sessionId.substring(0, 20)}...
          </p>
        )}

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-400">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          Go to Dashboard Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
