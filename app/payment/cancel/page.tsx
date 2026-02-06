'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, ArrowLeft } from 'lucide-react'

export default function PaymentCancelPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const invoiceId = searchParams.get('invoice_id')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Payment Cancelled</h1>

        <p className="text-gray-400 mb-8">
          Your payment was cancelled. No charges were made to your account.
        </p>

        <div className="space-y-3">
          {invoiceId && (
            <button
              onClick={() => router.push(`/payment/${invoiceId}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
