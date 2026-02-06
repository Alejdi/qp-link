'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Link as LinkIcon,
  Plus,
  Copy,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Euro
} from 'lucide-react'

// Import useEffect for CreateLinkForm

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
  qr_code_url: string | null
  created_at: string
  last_used_at: string | null
}

export default function PaymentLinksPage() {
  const { data: session } = useSession()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/payment-links')
      if (!res.ok) throw new Error('Failed to fetch links')
      const data = await res.json()
      setLinks(data.links || [])
    } catch (error) {
      console.error('Error fetching payment links:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = (shortCode: string, id: string) => {
    const url = `${window.location.origin}/pay/${shortCode}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to update link')
      fetchLinks()
    } catch (error) {
      console.error('Error toggling link:', error)
    }
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment link?')) return

    try {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete link')
      fetchLinks()
    } catch (error) {
      console.error('Error deleting link:', error)
    }
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
    if (selectedIds.size === links.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(links.map(l => l.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      const res = await fetch('/api/payment-links/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          linkIds: Array.from(selectedIds)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Bulk action failed')
      }

      const result = await res.json()

      // Refresh links
      await fetchLinks()

      // Clear selection
      setSelectedIds(new Set())

      alert(result.message || 'Action completed successfully')
    } catch (error: any) {
      console.error('Bulk action error:', error)
      alert(error.message || 'Failed to perform bulk action')
    } finally {
      setBulkActionLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-white mb-2">Payment Links</h1>
            <p className="text-gray-400">Create shareable payment links for quick payments</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            Create Link
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateLinkForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchLinks()
            }}
          />
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-6 bg-[#1A1A24] rounded-xl p-4 border border-[#2A2A3C]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-white">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('reset_usage')}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                >
                  Reset Usage
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.size} payment link(s)? This action cannot be undone.`)) {
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

        {/* Select All */}
        {links.length > 0 && (
          <div className="mb-4 bg-[#1A1A24] rounded-xl p-4 border border-[#2A2A3C]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === links.length && links.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-white">
                Select All ({links.length})
              </span>
            </label>
          </div>
        )}

        {/* Links Grid */}
        {links.length === 0 ? (
          <div className="bg-[#1A1A24] rounded-xl p-12 border border-[#2A2A3C] text-center">
            <LinkIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No payment links yet</h3>
            <p className="text-gray-400 mb-6">Create your first payment link to start accepting payments</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              Create First Link
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map((link) => (
              <div
                key={link.id}
                className={`rounded-xl p-6 border transition ${selectedIds.has(link.id) ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[#1A1A24] border-[#2A2A3C] hover:border-blue-500/50'}`}
              >
                {/* Checkbox & Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(link.id)}
                    onChange={() => toggleSelection(link.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      link.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">{link.link_type.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-semibold text-white mb-2">{link.title}</h3>
                {link.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{link.description}</p>
                )}

                {/* Amount */}
                <div className="mb-4">
                  {link.allow_custom_amount ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-400">Custom</span>
                      <span className="text-sm text-gray-400">
                        €{link.min_amount.toFixed(2)} - {link.max_amount ? `€${link.max_amount.toFixed(2)}` : '∞'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <Euro className="w-5 h-5 text-blue-400" />
                      <span className="text-2xl font-bold text-blue-400">{link.amount?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                  <span>{link.uses_count} uses</span>
                  {link.max_uses && (
                    <span>/ {link.max_uses} max</span>
                  )}
                </div>

                {/* Link URL */}
                <div className="bg-[#0A0A0F] rounded-lg p-3 mb-4 flex items-center gap-2">
                  <code className="text-sm text-blue-400 flex-1 truncate">
                    /pay/{link.short_code}
                  </code>
                  <button
                    onClick={() => copyLink(link.short_code, link.id)}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {copiedId === link.id ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`/pay/${link.short_code}`, '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => toggleActive(link.id, link.is_active)}
                    className="bg-[#2A2A3C] hover:bg-[#3A3A4C] text-white px-4 py-2 rounded-lg transition"
                  >
                    {link.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
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

function CreateLinkForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currencies, setCurrencies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    minAmount: '1.00',
    maxAmount: '',
    currency: 'EUR',
    allowCustomAmount: false,
    linkType: 'one_time',
    maxUses: '',
    expiresAt: '',
    requireEmail: true,
    requireName: false,
    successMessage: '',
    redirectUrl: ''
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
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          amount: formData.allowCustomAmount ? null : parseFloat(formData.amount),
          minAmount: parseFloat(formData.minAmount),
          maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
          currency: formData.currency,
          allowCustomAmount: formData.allowCustomAmount,
          linkType: formData.linkType,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expiresAt: formData.expiresAt || null,
          requireEmail: formData.requireEmail,
          requireName: formData.requireName,
          successMessage: formData.successMessage || null,
          redirectUrl: formData.redirectUrl || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create payment link')
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
        <h2 className="text-2xl font-bold text-white mb-6">Create Payment Link</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Coffee Tip Jar"
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

          {/* Link Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Link Type</label>
            <select
              value={formData.linkType}
              onChange={(e) => setFormData({ ...formData, linkType: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
            >
              <option value="one_time">One-time payment</option>
              <option value="donation">Donation</option>
              <option value="tip_jar">Tip jar</option>
            </select>
          </div>

          {/* Currency Selector */}
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
                    {curr.symbol} {curr.code} - {curr.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Custom Amount Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allowCustomAmount"
              checked={formData.allowCustomAmount}
              onChange={(e) => setFormData({ ...formData, allowCustomAmount: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="allowCustomAmount" className="text-sm text-gray-300">
              Allow custom amount
            </label>
          </div>

          {/* Amount Fields */}
          {formData.allowCustomAmount ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Min Amount (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Amount (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                  placeholder="No limit"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (€) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required={!formData.allowCustomAmount}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                placeholder="10.00"
              />
            </div>
          )}

          {/* Max Uses & Expiration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Uses</label>
              <input
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Expires At</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requireEmail"
                checked={formData.requireEmail}
                onChange={(e) => setFormData({ ...formData, requireEmail: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="requireEmail" className="text-sm text-gray-300">
                Require email address
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requireName"
                checked={formData.requireName}
                onChange={(e) => setFormData({ ...formData, requireName: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="requireName" className="text-sm text-gray-300">
                Require name
              </label>
            </div>
          </div>

          {/* Success Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Success Message</label>
            <input
              type="text"
              value={formData.successMessage}
              onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Thank you for your payment!"
            />
          </div>

          {/* Redirect URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Redirect URL</label>
            <input
              type="url"
              value={formData.redirectUrl}
              onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="https://yoursite.com/thank-you"
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
                'Create Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
