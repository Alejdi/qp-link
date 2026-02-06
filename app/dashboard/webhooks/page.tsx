'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Webhook,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Eye,
  AlertCircle,
  Loader2,
  Copy
} from 'lucide-react'

interface UserWebhook {
  id: string
  url: string
  description: string | null
  secret: string
  events: string[]
  is_active: boolean
  total_deliveries: number
  successful_deliveries: number
  failed_deliveries: number
  last_success_at: string | null
  last_failure_at: string | null
  consecutive_failures: number
  created_at: string
}

interface EventType {
  event_type: string
  category: string
  description: string
}

export default function WebhooksPage() {
  const { data: session } = useSession()
  const [webhooks, setWebhooks] = useState<UserWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks/user')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/user/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to update webhook')
      fetchWebhooks()
    } catch (error) {
      console.error('Error toggling webhook:', error)
      alert('Failed to update webhook')
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const res = await fetch(`/api/webhooks/user/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete webhook')
      fetchWebhooks()
    } catch (error) {
      console.error('Error deleting webhook:', error)
      alert('Failed to delete webhook')
    }
  }

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedSecret(id)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  const getSuccessRate = (webhook: UserWebhook) => {
    if (webhook.total_deliveries === 0) return 0
    return ((webhook.successful_deliveries / webhook.total_deliveries) * 100).toFixed(1)
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
            <h1 className="text-3xl font-bold text-white mb-2">Webhooks</h1>
            <p className="text-gray-400">
              Configure webhook endpoints to receive real-time event notifications
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={webhooks.length >= 10}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Create Webhook
          </button>
        </div>

        {webhooks.length >= 10 && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-400 text-sm">
              You've reached the maximum limit of 10 webhooks. Delete an existing webhook to create a new one.
            </p>
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateWebhookForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchWebhooks()
            }}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <div className="flex items-center gap-3 mb-2">
              <Webhook className="w-5 h-5 text-blue-400" />
              <p className="text-sm text-gray-400">Total Webhooks</p>
            </div>
            <p className="text-3xl font-bold text-white">{webhooks.length}</p>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-sm text-gray-400">Active</p>
            </div>
            <p className="text-3xl font-bold text-white">
              {webhooks.filter(w => w.is_active).length}
            </p>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <p className="text-sm text-gray-400">Total Deliveries</p>
            </div>
            <p className="text-3xl font-bold text-white">
              {webhooks.reduce((sum, w) => sum + w.total_deliveries, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <div className="bg-[#1A1A24] rounded-xl p-12 border border-[#2A2A3C] text-center">
            <Webhook className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No webhooks configured</h3>
            <p className="text-gray-400 mb-6">
              Create your first webhook to start receiving event notifications
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              Create First Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        webhook.is_active
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {webhook.consecutive_failures > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                          {webhook.consecutive_failures} consecutive failures
                        </span>
                      )}
                    </div>
                    {webhook.description && (
                      <h3 className="text-lg font-semibold text-white mb-2">{webhook.description}</h3>
                    )}
                    <p className="text-sm text-gray-400 font-mono mb-3">{webhook.url}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Total Deliveries</p>
                    <p className="text-lg font-bold text-white">{webhook.total_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                    <p className="text-lg font-bold text-green-400">{getSuccessRate(webhook)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Successful</p>
                    <p className="text-lg font-bold text-green-400">{webhook.successful_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Failed</p>
                    <p className="text-lg font-bold text-red-400">{webhook.failed_deliveries}</p>
                  </div>
                </div>

                {/* Events */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Subscribed Events:</p>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-[#2A2A3C] text-gray-300 text-xs rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Webhook Secret (for HMAC verification):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#0A0A0F] border border-[#2A2A3C] rounded px-3 py-2 text-xs text-gray-300 font-mono">
                      {webhook.secret}
                    </code>
                    <button
                      onClick={() => copySecret(webhook.secret, webhook.id)}
                      className="bg-[#2A2A3C] hover:bg-[#3A3A4C] text-white px-3 py-2 rounded transition"
                    >
                      {copiedSecret === webhook.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => window.location.href = `/dashboard/webhooks/${webhook.id}/deliveries`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Deliveries
                  </button>
                  <button
                    onClick={() => toggleActive(webhook.id, webhook.is_active)}
                    className="bg-[#2A2A3C] hover:bg-[#3A3A4C] text-white px-4 py-2 rounded-lg transition"
                  >
                    {webhook.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition"
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

function CreateWebhookForm({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eventTypes, setEventTypes] = useState<Record<string, EventType[]>>({})
  const [formData, setFormData] = useState({
    url: '',
    description: '',
    events: [] as string[]
  })

  useEffect(() => {
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      const res = await fetch('/api/webhooks/events')
      if (res.ok) {
        const data = await res.json()
        setEventTypes(data.eventTypes || {})
      }
    } catch (error) {
      console.error('Failed to fetch event types:', error)
    }
  }

  const toggleEvent = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter(e => e !== eventType)
        : [...prev.events, eventType]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (formData.events.length === 0) {
        throw new Error('Please select at least one event type')
      }

      const res = await fetch('/api/webhooks/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create webhook')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#1A1A24] rounded-xl max-w-2xl w-full p-6 border border-[#2A2A3C] my-8">
        <h2 className="text-2xl font-bold text-white mb-6">Create Webhook</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="https://your-site.com/webhooks/qplink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Production webhook for payment notifications"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Event Types <span className="text-red-400">*</span>
            </label>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {Object.entries(eventTypes).map(([category, events]) => (
                <div key={category} className="bg-[#0A0A0F] rounded-lg p-4 border border-[#2A2A3C]">
                  <h4 className="text-sm font-semibold text-white mb-3 capitalize">{category}</h4>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <label key={event.event_type} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.event_type)}
                          onChange={() => toggleEvent(event.event_type)}
                          className="w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition">
                            {event.event_type}
                          </p>
                          <p className="text-xs text-gray-400">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                'Create Webhook'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
