'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Package, Lock, CheckCircle, Clock, AlertCircle, Truck } from 'lucide-react'
import { FuturisticLoader } from '@/components/ui/FuturisticLoader'

interface Escrow {
  id: string
  buyerEmail: string
  amount: number
  netAmount: number
  platformFee: number
  processorFee: number
  currency: string
  paymentSource: string
  status: string
  sellerConfirmed: boolean
  buyerConfirmed: boolean
  trackingNumber: string | null
  trackingCarrier: string | null
  shippedAt: string | null
  autoReleaseAt: string
  invoice: {
    id: string
    name: string
    short_code: string
  }
  createdAt: string
  releasedAt: string | null
}

interface Summary {
  held: number
  released: number
  refunded: number
  disputed: number
  totalHeld: number
  totalReleased: number
}

export default function EscrowPage() {
  const { data: session } = useSession()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [tracking, setTracking] = useState({ number: '', carrier: '' })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchEscrows()
  }, [filter])

  const fetchEscrows = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)

      const res = await fetch(`/api/escrow?${params}`)
      if (!res.ok) throw new Error('Failed to fetch escrows')

      const data = await res.json()
      setEscrows(data.escrows || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching escrows:', error)
    } finally {
      setLoading(false)
    }
  }

  const openShipModal = (escrow: Escrow) => {
    setSelectedEscrow(escrow)
    setTracking({ number: escrow.trackingNumber || '', carrier: escrow.trackingCarrier || '' })
    setModalOpen(true)
  }

  const handleConfirmShipped = async () => {
    if (!selectedEscrow) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/escrow/${selectedEscrow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_shipped',
          trackingNumber: tracking.number,
          trackingCarrier: tracking.carrier,
        }),
      })

      if (!res.ok) throw new Error('Failed to confirm shipment')

      setModalOpen(false)
      fetchEscrows()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'held': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'released': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'refunded': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'disputed': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysUntilAutoRelease = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <FuturisticLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Escrow Management</h1>
          <p className="text-gray-400">Manage your held funds and shipments</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Held in Escrow</span>
              </div>
              <p className="text-3xl font-bold text-white">€{summary.totalHeld.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">{summary.held} transactions</p>
            </div>

            <div className="bg-gray-800 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Released</span>
              </div>
              <p className="text-3xl font-bold text-white">€{summary.totalReleased.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">{summary.released} transactions</p>
            </div>

            <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-400 text-sm">Disputed</span>
              </div>
              <p className="text-3xl font-bold text-white">{summary.disputed}</p>
              <p className="text-sm text-gray-500 mt-1">Active disputes</p>
            </div>

            <div className="bg-gray-800 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-red-400" />
                <span className="text-gray-400 text-sm">Refunded</span>
              </div>
              <p className="text-3xl font-bold text-white">{summary.refunded}</p>
              <p className="text-sm text-gray-500 mt-1">Total refunds</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'held', 'released', 'disputed', 'refunded'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Escrows List */}
        {escrows.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center">
            <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Escrows Found</h3>
            <p className="text-gray-400">
              {filter === 'all'
                ? 'You have no escrow transactions yet.'
                : `No ${filter} escrows found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {escrows.map((escrow) => (
              <div key={escrow.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{escrow.invoice.name}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(escrow.status)}`}>
                        {escrow.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">Invoice #{escrow.invoice.short_code}</p>
                    <p className="text-gray-500 text-sm">Buyer: {escrow.buyerEmail}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">€{escrow.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">You receive: €{escrow.netAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Fees: €{(escrow.platformFee + escrow.processorFee).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {escrow.sellerConfirmed ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-gray-300">Seller Confirmation</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {escrow.sellerConfirmed ? 'Shipment confirmed' : 'Awaiting shipment'}
                    </p>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {escrow.buyerConfirmed ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-gray-300">Buyer Confirmation</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {escrow.buyerConfirmed ? 'Receipt confirmed' : 'Awaiting confirmation'}
                    </p>
                  </div>
                </div>

                {/* Tracking Info */}
                {escrow.trackingNumber && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-blue-400 font-medium">Tracking Information</span>
                    </div>
                    <p className="text-white text-sm">{escrow.trackingCarrier}: {escrow.trackingNumber}</p>
                    {escrow.shippedAt && (
                      <p className="text-xs text-gray-400 mt-1">Shipped: {formatDate(escrow.shippedAt)}</p>
                    )}
                  </div>
                )}

                {/* Auto-release countdown */}
                {escrow.status === 'held' && escrow.sellerConfirmed && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-400">
                      Auto-release in {getDaysUntilAutoRelease(escrow.autoReleaseAt)} days if buyer doesn't respond
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {escrow.status === 'held' && !escrow.sellerConfirmed && (
                    <button
                      onClick={() => openShipModal(escrow)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      Confirm Shipment
                    </button>
                  )}

                  <div className="text-xs text-gray-500">
                    Created: {formatDate(escrow.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ship Modal */}
      {modalOpen && selectedEscrow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Confirm Shipment</h3>
            <p className="text-gray-400 mb-6">
              Confirm that you've shipped the item to {selectedEscrow.buyerEmail}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  value={tracking.number}
                  onChange={(e) => setTracking({ ...tracking, number: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Carrier (Optional)
                </label>
                <input
                  type="text"
                  value={tracking.carrier}
                  onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., DHL, FedEx, UPS"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={updating}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShipped}
                disabled={updating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
              >
                {updating ? 'Confirming...' : 'Confirm Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
