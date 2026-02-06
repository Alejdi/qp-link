'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
  DollarSign,
  Send
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  product_name: string
  product_description: string | null
  default_price: number | null
  currency: string
  payment_terms_days: number
  tax_percentage: number
  times_used: number
  is_default: boolean
  tags: string[]
  created_at: string
  last_used_at: string | null
  line_items: any[]
}

export default function InvoiceTemplatesPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showUseModal, setShowUseModal] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/invoice-templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const duplicateTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/invoice-templates/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!res.ok) throw new Error('Failed to duplicate')
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const res = await fetch(`/api/invoice-templates/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const setAsDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/invoice-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      })

      if (!res.ok) throw new Error('Failed to update')
      fetchTemplates()
    } catch (error) {
      console.error('Error setting default:', error)
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
            <h1 className="text-3xl font-bold text-white mb-2">Invoice Templates</h1>
            <p className="text-gray-400">Save and reuse invoice configurations</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            Create Template
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateTemplateForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchTemplates()
            }}
          />
        )}

        {/* Use Template Modal */}
        {showUseModal && (
          <UseTemplateModal
            templateId={showUseModal}
            onClose={() => setShowUseModal(null)}
            onSuccess={() => {
              setShowUseModal(null)
              // Could navigate to invoice or show success message
            }}
          />
        )}

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-[#1A1A24] rounded-xl p-12 border border-[#2A2A3C] text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No templates yet</h3>
            <p className="text-gray-400 mb-6">Create your first invoice template to save time</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              Create First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C] hover:border-blue-500/50 transition relative"
              >
                {/* Default Badge */}
                {template.is_default && (
                  <div className="absolute top-4 right-4">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                )}

                {/* Template Name */}
                <h3 className="text-lg font-semibold text-white mb-2 pr-8">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{template.description}</p>
                )}

                {/* Product Info */}
                <div className="mb-4">
                  <p className="text-sm text-gray-300">{template.product_name}</p>
                  {template.default_price && (
                    <div className="flex items-baseline gap-1 mt-1">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                      <span className="text-xl font-bold text-blue-400">
                        {template.default_price.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400">{template.currency}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                  <span>Used {template.times_used} times</span>
                  <span>•</span>
                  <span>Net {template.payment_terms_days} days</span>
                </div>

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-[#2A2A3C]">
                  <button
                    onClick={() => setShowUseModal(template.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Use
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={() => setAsDefault(template.id)}
                      className="bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 px-3 py-2 rounded-lg transition"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => duplicateTemplate(template.id)}
                    className="bg-[#2A2A3C] hover:bg-[#3A3A4C] text-white px-3 py-2 rounded-lg transition"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
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

function CreateTemplateForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currencies, setCurrencies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    productName: '',
    productDescription: '',
    defaultPrice: '',
    currency: 'EUR',
    paymentTermsDays: '7',
    taxPercentage: '0',
    notes: '',
    isDefault: false
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
      const res = await fetch('/api/invoice-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          productName: formData.productName,
          productDescription: formData.productDescription || null,
          defaultPrice: formData.defaultPrice ? parseFloat(formData.defaultPrice) : null,
          currency: formData.currency,
          paymentTermsDays: parseInt(formData.paymentTermsDays),
          taxPercentage: parseFloat(formData.taxPercentage),
          notes: formData.notes || null,
          isDefault: formData.isDefault
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
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
        <h2 className="text-2xl font-bold text-white mb-6">Create Invoice Template</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Standard Consulting Invoice"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              rows={2}
              placeholder="Template for consulting services"
            />
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product/Service Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Consulting Services"
            />
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Description</label>
            <textarea
              value={formData.productDescription}
              onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Professional consulting services..."
            />
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.defaultPrice}
                onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
                placeholder="100.00"
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

          {/* Payment Terms & Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms (days)</label>
              <input
                type="number"
                min="0"
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tax %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })}
                className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes/Terms</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Payment terms and conditions..."
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-300">
              Set as default template
            </label>
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
                'Create Template'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UseTemplateModal({ templateId, onClose, onSuccess }: {
  templateId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    overridePrice: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/invoice-templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: formData.customerEmail,
          customerName: formData.customerName || null,
          overridePrice: formData.overridePrice ? parseFloat(formData.overridePrice) : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create invoice')
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
      <div className="bg-[#1A1A24] rounded-xl max-w-md w-full p-6 border border-[#2A2A3C]">
        <h2 className="text-2xl font-bold text-white mb-6">Create Invoice from Template</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Override Price</label>
            <input
              type="number"
              step="0.01"
              value={formData.overridePrice}
              onChange={(e) => setFormData({ ...formData, overridePrice: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="Leave empty to use template price"
            />
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
                'Create Invoice'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
