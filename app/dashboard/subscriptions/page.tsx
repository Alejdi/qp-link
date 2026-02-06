'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw,
  Plus,
  Pause,
  Play,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'

interface Subscription {
  id: string
  name: string
  description: string | null
  amount: number
  currency: string
  interval: string
  interval_count: number
  customer_email: string
  customer_name: string | null
  status: string
  next_billing_date: string | null
  current_period_end: string | null
  trial_end_at: string | null
  created_at: string
}

export default function SubscriptionsPage() {
  const { data: session } = useSession()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions')
      if (!res.ok) throw new Error('Failed to fetch subscriptions')
      const data = await res.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: string, immediate = false) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, immediate })
      })

      if (!res.ok) throw new Error('Action failed')
      fetchSubscriptions()
    } catch (error) {
      console.error('Error performing action:', error)
    }
  }

  const deleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription? This will cancel it for the customer.')) return

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete')
      fetchSubscriptions()
    } catch (error) {
      console.error('Error deleting subscription:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/50'
      case 'trialing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50'
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50'
      case 'canceled':
        return 'bg-red-500/10 text-red-400 border-red-500/50'
      case 'paused':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/50'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/50'
    }
  }

  const formatInterval = (interval: string, count: number) => {
    const unit = count === 1 ? interval : `${interval}s`
    return count === 1 ? `Every ${unit}` : `Every ${count} ${unit}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Subscriptions</h1>
            <p className="text-gray-400">Manage recurring payments and subscriptions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            Create Subscription
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateSubscriptionForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchSubscriptions()
            }}
          />
        )}

        {/* Subscriptions Grid */}
        {subscriptions.length === 0 ? (
          <div className="bg-[#1A1A24] rounded-xl p-12 border border-[#2A2A3C] text-center">
            <RefreshCw className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No subscriptions yet</h3>
            <p className="text-gray-400 mb-6">Create your first subscription to start accepting recurring payments</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              Create First Subscription
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C] hover:border-blue-500/50 transition"
              >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sub.status)}`}>
                    {sub.status}
                  </span>
                  <span className="text-xs text-gray-500">{formatInterval(sub.interval, sub.interval_count)}</span>
                </div>

                {/* Name & Description */}
                <h3 className="text-lg font-semibold text-white mb-2">{sub.name}</h3>
                {sub.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{sub.description}</p>
                )}

                {/* Amount */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                    <span className="text-2xl font-bold text-blue-400">
                      {sub.amount.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400">{sub.currency}</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="truncate">{sub.customer_name || sub.customer_email}</span>
                  </div>
                  {sub.next_billing_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Next: {new Date(sub.next_billing_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-[#2A2A3C]">
                  {sub.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleAction(sub.id, 'pause')}
                        className="flex-1 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                      <button
                        onClick={() => handleAction(sub.id, 'cancel')}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                      >
                        <Clock className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                  {sub.status === 'paused' && (
                    <button
                      onClick={() => handleAction(sub.id, 'resume')}
                      className="flex-1 bg-green-600/10 hover:bg-green-600/20 text-green-400 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => deleteSubscription(sub.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateSubscriptionForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currencies, setCurrencies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'EUR',
    interval: 'month',
    intervalCount: '1',
    customerEmail: '',
    customerName: '',
    trialDays: ''
  })

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await fetch('/api/currencies')
        if (res.ok) {
          const data = await res.json()
          setCurrencies(data.currencies || [])
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error)
      }
    }
    fetchCurrencies()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          interval: formData.interval,
          intervalCount: parseInt(formData.intervalCount),
          customerEmail: formData.customerEmail,
          customerName: formData.customerName || null,
          trialDays: formData.trialDays ? parseInt(formData.trialDays) : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create subscription')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A1A24] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-[#2A2A3C]">
        <h2 className="text-2xl font-bold text-white mb-6">Create Subscription</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subscription Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Monthly Premium Plan"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                placeholder="9.99"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              >
                {currencies.length === 0 ? (
                  <option>EUR - Euro</option>
                ) : (
                  currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Interval & Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Billing Interval <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Every X {formData.interval}(s)</label>
              <input
                type="number"
                min="1"
                value={formData.intervalCount}
                onChange={(e) => setFormData({ ...formData, intervalCount: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          {/* Customer Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="customer@example.com"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Optional"
            />
          </div>

          {/* Trial Days */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Trial Period (days)</label>
            <input
              type="number"
              min="0"
              value={formData.trialDays}
              onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="0 for no trial"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2A2A3C] hover:bg-[#3A3A4C] text-white px-6 py-3 rounded-lg transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subscription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
