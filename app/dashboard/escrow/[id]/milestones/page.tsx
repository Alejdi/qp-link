'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Plus,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface Milestone {
  id: string
  escrow_id: string
  title: string
  description: string | null
  amount: number
  percentage: number
  sequence_order: number
  status: string
  requires_buyer_approval: boolean
  buyer_approved_at: string | null
  buyer_approval_notes: string | null
  requires_seller_approval: boolean
  seller_approved_at: string | null
  seller_approval_notes: string | null
  released_at: string | null
  released_amount: number | null
  created_at: string
}

interface Escrow {
  id: string
  buyer_id: string
  seller_id: string
  amount: number
  currency: string
  status: string
  has_milestones: boolean
}

export default function EscrowMilestonesPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  const [escrow, setEscrow] = useState<Escrow | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchEscrowAndMilestones()
  }, [params.id])

  const fetchEscrowAndMilestones = async () => {
    try {
      // Fetch escrow details
      const escrowRes = await fetch(`/api/escrow/${params.id}`)
      if (escrowRes.ok) {
        const escrowData = await escrowRes.json()
        setEscrow(escrowData.escrow)
      }

      // Fetch milestones
      const milestonesRes = await fetch(`/api/escrow/${params.id}/milestones`)
      if (milestonesRes.ok) {
        const data = await milestonesRes.json()
        setMilestones(data.milestones || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveMilestone = async (milestoneId: string, notes: string = '') => {
    setActionLoading(milestoneId)
    try {
      const res = await fetch(`/api/escrow/milestones/${milestoneId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalNotes: notes })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve milestone')
      }

      await fetchEscrowAndMilestones()
      alert('Milestone approved successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to approve milestone')
    } finally {
      setActionLoading(null)
    }
  }

  const rejectMilestone = async (milestoneId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    setActionLoading(milestoneId)
    try {
      const res = await fetch(`/api/escrow/milestones/${milestoneId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject milestone')
      }

      await fetchEscrowAndMilestones()
      alert('Milestone rejected')
    } catch (error: any) {
      alert(error.message || 'Failed to reject milestone')
    } finally {
      setActionLoading(null)
    }
  }

  const releaseMilestone = async (milestoneId: string) => {
    if (!confirm('Release funds for this milestone? This action cannot be undone.')) return

    setActionLoading(milestoneId)
    try {
      const res = await fetch(`/api/escrow/milestones/${milestoneId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to release milestone')
      }

      await fetchEscrowAndMilestones()
      alert('Milestone funds released successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to release milestone')
    } finally {
      setActionLoading(null)
    }
  }

  const isBuyer = escrow?.buyer_id === session?.user?.id
  const totalPercentage = milestones.reduce((sum, m) => sum + parseFloat(m.percentage.toString()), 0)
  const releasedAmount = milestones
    .filter(m => m.status === 'released')
    .reduce((sum, m) => sum + (m.released_amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Escrow Milestones</h1>
              <p className="text-gray-400">
                Manage phased releases for escrow {escrow?.id.slice(0, 8)}...
              </p>
            </div>

            {escrow?.status === 'active' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                Add Milestone
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <p className="text-sm text-gray-400 mb-1">Total Escrow</p>
            <p className="text-2xl font-bold text-white">
              {escrow?.currency} {escrow?.amount.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <p className="text-sm text-gray-400 mb-1">Milestones</p>
            <p className="text-2xl font-bold text-white">{milestones.length}</p>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <p className="text-sm text-gray-400 mb-1">Allocated</p>
            <p className="text-2xl font-bold text-blue-400">{totalPercentage.toFixed(1)}%</p>
          </div>

          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <p className="text-sm text-gray-400 mb-1">Released</p>
            <p className="text-2xl font-bold text-green-400">
              {escrow?.currency} {releasedAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {totalPercentage > 0 && (
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C] mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">Total Progress</span>
              <span className="text-sm text-gray-400">{totalPercentage.toFixed(1)}% / 100%</span>
            </div>
            <div className="w-full bg-[#0A0A0F] rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              ></div>
            </div>
            {totalPercentage < 100 && (
              <p className="text-xs text-yellow-400 mt-2">
                {(100 - totalPercentage).toFixed(1)}% remaining to allocate
              </p>
            )}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <CreateMilestoneForm
            escrowId={params.id as string}
            remainingPercentage={100 - totalPercentage}
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchEscrowAndMilestones()
            }}
          />
        )}

        {/* Milestones List */}
        {milestones.length === 0 ? (
          <div className="bg-[#1A1A24] rounded-xl p-12 border border-[#2A2A3C] text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No milestones yet</h3>
            <p className="text-gray-400 mb-6">
              Create milestones to enable phased release of escrow funds
            </p>
            {escrow?.status === 'active' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                Create First Milestone
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-[#2A2A3C] text-gray-300 text-xs font-medium rounded">
                        #{milestone.sequence_order}
                      </span>
                      <h3 className="text-lg font-semibold text-white">{milestone.title}</h3>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-400 mb-3">{milestone.description}</p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    milestone.status === 'released'
                      ? 'bg-green-500/10 text-green-400'
                      : milestone.status === 'approved'
                      ? 'bg-blue-500/10 text-blue-400'
                      : milestone.status === 'rejected'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {milestone.status}
                  </span>
                </div>

                {/* Amount & Percentage */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Amount</p>
                    <p className="text-lg font-bold text-white">
                      {escrow?.currency} {milestone.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Percentage</p>
                    <p className="text-lg font-bold text-blue-400">
                      {milestone.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Approval Status */}
                <div className="space-y-2 mb-4">
                  {milestone.requires_buyer_approval && (
                    <div className="flex items-center gap-2 text-sm">
                      {milestone.buyer_approved_at ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className={milestone.buyer_approved_at ? 'text-green-400' : 'text-gray-400'}>
                        Buyer approval: {milestone.buyer_approved_at ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  )}
                  {milestone.requires_seller_approval && (
                    <div className="flex items-center gap-2 text-sm">
                      {milestone.seller_approved_at ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className={milestone.seller_approved_at ? 'text-green-400' : 'text-gray-400'}>
                        Seller approval: {milestone.seller_approved_at ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {milestone.status !== 'released' && milestone.status !== 'rejected' && (
                  <div className="flex gap-2">
                    {isBuyer && !milestone.buyer_approved_at && (
                      <>
                        <button
                          onClick={() => approveMilestone(milestone.id)}
                          disabled={actionLoading === milestone.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === milestone.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectMilestone(milestone.id)}
                          disabled={actionLoading === milestone.id}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {isBuyer && milestone.status === 'approved' && !milestone.released_at && (
                      <button
                        onClick={() => releaseMilestone(milestone.id)}
                        disabled={actionLoading === milestone.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {actionLoading === milestone.id ? 'Releasing...' : 'Release Funds'}
                      </button>
                    )}
                    {!isBuyer && !milestone.seller_approved_at && (
                      <button
                        onClick={() => approveMilestone(milestone.id)}
                        disabled={actionLoading === milestone.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {actionLoading === milestone.id ? 'Processing...' : 'Approve'}
                      </button>
                    )}
                  </div>
                )}

                {/* Released Info */}
                {milestone.released_at && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400">
                      Released on {new Date(milestone.released_at).toLocaleDateString()} -
                      {escrow?.currency} {milestone.released_amount?.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Rejection Info */}
                {milestone.status === 'rejected' && milestone.buyer_approval_notes && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">
                      <strong>Rejection reason:</strong> {milestone.buyer_approval_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateMilestoneForm({
  escrowId,
  remainingPercentage,
  onClose,
  onSuccess
}: {
  escrowId: string
  remainingPercentage: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    percentage: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const percentage = parseFloat(formData.percentage)

      if (percentage > remainingPercentage) {
        throw new Error(`Percentage cannot exceed ${remainingPercentage.toFixed(1)}%`)
      }

      const res = await fetch(`/api/escrow/${escrowId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          percentage
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create milestone')
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
        <h2 className="text-2xl font-bold text-white mb-6">Create Milestone</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Design Phase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Complete UI/UX design mockups"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Percentage <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={remainingPercentage}
              required
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white"
              placeholder="25"
            />
            <p className="text-xs text-gray-400 mt-1">
              Max: {remainingPercentage.toFixed(1)}% available
            </p>
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
                'Create Milestone'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
