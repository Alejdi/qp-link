'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FraudAlert {
  id: string
  user_id: string
  transaction_id: string
  alert_type: string
  severity: string
  message: string
  details: any
  status: string
  created_at: string
  user?: { id: string; email: string; name: string }
  transaction?: { id: string; amount: number; currency: string; type: string }
}

interface BlockedEntity {
  id: string
  entity_type: string
  entity_value: string
  reason: string
  is_permanent: boolean
  expires_at: string | null
  created_at: string
}

export default function FraudDetectionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'alerts' | 'blocked'>('alerts')
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [alertFilter, setAlertFilter] = useState('pending')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Block entity form
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockForm, setBlockForm] = useState({
    entityType: 'ip',
    entityValue: '',
    reason: '',
    isPermanent: false,
    expiresAt: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadData()
    }
  }, [status, router, alertFilter, severityFilter])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'alerts') {
        const params = new URLSearchParams({ status: alertFilter })
        if (severityFilter) params.append('severity', severityFilter)

        const res = await fetch(`/api/fraud/alerts?${params}`)
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } else {
        const res = await fetch('/api/fraud/blocked-entities')
        if (res.ok) {
          const data = await res.json()
          setBlockedEntities(data.entities || [])
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateAlertStatus(alertId: string, newStatus: string) {
    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/fraud/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: newStatus === 'resolved' || newStatus === 'false_positive' ? resolutionNotes : undefined
        })
      })

      if (res.ok) {
        setSuccess('Alert updated successfully')
        setSelectedAlert(null)
        setResolutionNotes('')
        loadData()
      } else {
        setError('Failed to update alert')
      }
    } catch (err) {
      setError('Failed to update alert')
    } finally {
      setActionLoading(false)
    }
  }

  async function blockEntity() {
    if (!blockForm.entityValue || !blockForm.reason) {
      setError('Entity value and reason are required')
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/fraud/blocked-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockForm)
      })

      if (res.ok) {
        setSuccess('Entity blocked successfully')
        setShowBlockForm(false)
        setBlockForm({
          entityType: 'ip',
          entityValue: '',
          reason: '',
          isPermanent: false,
          expiresAt: ''
        })
        loadData()
      } else {
        setError('Failed to block entity')
      }
    } catch (err) {
      setError('Failed to block entity')
    } finally {
      setActionLoading(false)
    }
  }

  async function unblockEntity(entityId: string) {
    if (!confirm('Are you sure you want to unblock this entity?')) return

    try {
      const res = await fetch(`/api/fraud/blocked-entities/${entityId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setSuccess('Entity unblocked successfully')
        loadData()
      } else {
        setError('Failed to unblock entity')
      }
    } catch (err) {
      setError('Failed to unblock entity')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading fraud detection...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fraud Detection</h1>
          <p className="mt-2 text-gray-600">Monitor and manage fraud alerts and blocked entities</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => { setActiveTab('alerts'); loadData() }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'alerts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fraud Alerts
            </button>
            <button
              onClick={() => { setActiveTab('blocked'); loadData() }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'blocked'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Blocked Entities
            </button>
          </nav>
        </div>

        {activeTab === 'alerts' ? (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4">
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
                <option value="all">All</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                  No alerts found
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-sm text-gray-500">{alert.alert_type}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            alert.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                            alert.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-gray-900 mb-2">{alert.message}</p>
                        <div className="text-sm text-gray-600">
                          <p>User: {alert.user?.email} ({alert.user?.name})</p>
                          {alert.transaction && (
                            <p>Transaction: {alert.transaction.currency} {alert.transaction.amount} - {alert.transaction.type}</p>
                          )}
                          <p>Date: {new Date(alert.created_at).toLocaleString()}</p>
                          {alert.details?.flags && (
                            <p className="mt-1">
                              Flags: {alert.details.flags.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alert.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Investigate
                            </button>
                            <button
                              onClick={() => updateAlertStatus(alert.id, 'false_positive')}
                              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                              disabled={actionLoading}
                            >
                              False Positive
                            </button>
                          </>
                        )}
                        {alert.status === 'investigating' && (
                          <button
                            onClick={() => {
                              setSelectedAlert(alert)
                            }}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Resolution Modal */}
            {selectedAlert && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">Resolve Alert</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution Notes
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={4}
                      placeholder="Add notes about the resolution..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateAlertStatus(selectedAlert.id, selectedAlert.status === 'pending' ? 'investigating' : 'resolved')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : selectedAlert.status === 'pending' ? 'Start Investigation' : 'Mark Resolved'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAlert(null)
                        setResolutionNotes('')
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Block Entity Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowBlockForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Block New Entity
              </button>
            </div>

            {/* Blocked Entities List */}
            <div className="space-y-4">
              {blockedEntities.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                  No blocked entities
                </div>
              ) : (
                blockedEntities.map((entity) => (
                  <div key={entity.id} className="bg-white rounded-lg shadow-sm p-6 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {entity.entity_type}
                        </span>
                        {entity.is_permanent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            Permanent
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-sm text-gray-900 mb-1">{entity.entity_value}</p>
                      <p className="text-sm text-gray-600 mb-1">Reason: {entity.reason}</p>
                      <p className="text-xs text-gray-500">
                        Blocked: {new Date(entity.created_at).toLocaleString()}
                      </p>
                      {entity.expires_at && (
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(entity.expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => unblockEntity(entity.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Block Entity Modal */}
            {showBlockForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">Block Entity</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Type
                      </label>
                      <select
                        value={blockForm.entityType}
                        onChange={(e) => setBlockForm({ ...blockForm, entityType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="ip">IP Address</option>
                        <option value="email">Email</option>
                        <option value="card_hash">Card Hash</option>
                        <option value="device_fingerprint">Device Fingerprint</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Value
                      </label>
                      <input
                        type="text"
                        value={blockForm.entityValue}
                        onChange={(e) => setBlockForm({ ...blockForm, entityValue: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter value to block"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <textarea
                        value={blockForm.reason}
                        onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                        placeholder="Why is this being blocked?"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPermanent"
                        checked={blockForm.isPermanent}
                        onChange={(e) => setBlockForm({ ...blockForm, isPermanent: e.target.checked })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor="isPermanent" className="ml-2 text-sm text-gray-700">
                        Permanent block
                      </label>
                    </div>
                    {!blockForm.isPermanent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expires At (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={blockForm.expiresAt}
                          onChange={(e) => setBlockForm({ ...blockForm, expiresAt: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={blockEntity}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Blocking...' : 'Block Entity'}
                    </button>
                    <button
                      onClick={() => setShowBlockForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
