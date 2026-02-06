'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Euro,
  CreditCard,
  Mail,
  User
} from 'lucide-react'

interface PaymentLink {
  id: string
  title: string
  description: string | null
  short_code: string
  amount: number | null
  min_amount: number
  max_amount: number | null
  currency: string
  allow_custom_amount: boolean
  link_type: string
  is_active: boolean
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  require_email: boolean
  require_name: boolean
  success_message: string | null
  redirect_url: string | null
  user: {
    name: string
    email: string
  }
}

export default function PaymentLinkPage() {
  const params = useParams()
  const shortCode = params?.shortCode as string

  const [link, setLink] = useState<PaymentLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const [formData, setFormData] = useState({
    amount: '',
    email: '',
    name: '',
    message: ''
  })

  useEffect(() => {
    if (shortCode) {
      fetchLink()
    }
  }, [shortCode])

  const fetchLink = async () => {
    try {
      const res = await fetch(`/api/payment-links/public/${shortCode}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Payment link not found')
      }
      const data = await res.json()
      setLink(data.link)

      // Pre-fill amount if not custom
      if (data.link.amount && !data.link.allow_custom_amount) {
        setFormData(prev => ({ ...prev, amount: data.link.amount.toString() }))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      // Validation
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      if (link?.allow_custom_amount) {
        if (amount < link.min_amount) {
          throw new Error(`Minimum amount is €${link.min_amount.toFixed(2)}`)
        }
        if (link.max_amount && amount > link.max_amount) {
          throw new Error(`Maximum amount is €${link.max_amount.toFixed(2)}`)
        }
      }

      if (link?.require_email && !formData.email) {
        throw new Error('Email is required')
      }

      if (link?.require_name && !formData.name) {
        throw new Error('Name is required')
      }

      // Create checkout session
      const res = await fetch('/api/payment-links/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_link_id: link?.id,
          amount: amount,
          email: formData.email,
          name: formData.name,
          message: formData.message
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const data = await res.json()

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error && !link) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A24] rounded-xl p-8 border border-red-500/50 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Payment Link Not Found</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!link?.is_active) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A24] rounded-xl p-8 border border-yellow-500/50 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Link Inactive</h2>
          <p className="text-gray-400">This payment link is no longer active</p>
        </div>
      </div>
    )
  }

  // Check if expired
  if (link?.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A24] rounded-xl p-8 border border-red-500/50 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Link Expired</h2>
          <p className="text-gray-400">This payment link has expired</p>
        </div>
      </div>
    )
  }

  // Check if max uses reached
  if (link?.max_uses && link.uses_count >= link.max_uses) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A24] rounded-xl p-8 border border-red-500/50 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Link No Longer Available</h2>
          <p className="text-gray-400">This payment link has reached its maximum number of uses</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="bg-[#1A1A24] rounded-xl p-8 border border-[#2A2A3C] max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{link?.title}</h1>
          {link?.description && (
            <p className="text-gray-400">{link.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Payment to {link?.user.name}
          </p>
        </div>

        {/* Amount Display */}
        {!link?.allow_custom_amount && link?.amount && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-gray-400 mb-2">Amount</p>
            <div className="flex items-center justify-center gap-2">
              <Euro className="w-8 h-8 text-blue-400" />
              <span className="text-4xl font-bold text-white">{link.amount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Custom Amount */}
          {link?.allow_custom_amount && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (€) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min={link.min_amount}
                  max={link.max_amount || undefined}
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg pl-10 pr-4 py-3 text-white text-lg"
                  placeholder={`Min: €${link.min_amount.toFixed(2)}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Min: €{link.min_amount.toFixed(2)}
                {link.max_amount && ` - Max: €${link.max_amount.toFixed(2)}`}
              </p>
            </div>
          )}

          {/* Email */}
          {link?.require_email && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg pl-10 pr-4 py-3 text-white"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          )}

          {/* Name */}
          {link?.require_name && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg pl-10 pr-4 py-3 text-white"
                  placeholder="Your Name"
                />
              </div>
            </div>
          )}

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-3 text-white"
              rows={3}
              placeholder="Add a note..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-4 rounded-lg flex items-center justify-center gap-2 transition text-lg font-semibold"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Continue to Payment
              </>
            )}
          </button>
        </form>

        {/* Trust Badges */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
