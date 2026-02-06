'use client'

import { useState, useEffect } from 'react'

interface BannedIP {
  id: string
  ip_address: string
  reason: string
  banned_by: string
  created_at: string
  expires_at: string | null
}

interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: any
  created_at: string
  user?: { name: string; email: string }
}

export default function AdminSecurity() {
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banForm, setBanForm] = useState({ ip_address: '', reason: '', expires_at: '' })
  const [banning, setBanning] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'ips' | 'logs'>('ips')

  useEffect(() => {
    fetchData()
  }, [page, search])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch banned IPs
      const ipsRes = await fetch(`/api/admin/ips?page=${page}&search=${search}`)
      if (ipsRes.ok) {
        const ipsData = await ipsRes.json()
        setBannedIPs(ipsData.ips || [])
        setTotalPages(ipsData.pagination?.totalPages || 1)
      }

      // Fetch activity logs
      const logsRes = await fetch('/api/admin/activity?limit=50')
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setActivityLogs(logsData.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBanIP() {
    if (!banForm.ip_address) return

    setBanning(true)
    try {
      const res = await fetch('/api/admin/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: banForm.ip_address,
          reason: banForm.reason,
          expires_at: banForm.expires_at || null,
        }),
      })

      if (res.ok) {
        setShowBanModal(false)
        setBanForm({ ip_address: '', reason: '', expires_at: '' })
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to ban IP')
      }
    } catch (error) {
      console.error('Failed to ban IP:', error)
      alert('Failed to ban IP')
    } finally {
      setBanning(false)
    }
  }

  async function handleUnbanIP(id: string, ip: string) {
    if (!confirm(`Are you sure you want to unban ${ip}?`)) return

    try {
      const res = await fetch(`/api/admin/ips?id=${id}&ip=${ip}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
      } else {
        alert('Failed to unban IP')
      }
    } catch (error) {
      console.error('Failed to unban IP:', error)
    }
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Security</h1>
          <p className="text-[#9CA3AF] mt-1">Manage IP bans and view activity logs</p>
        </div>
        <button
          onClick={() => setShowBanModal(true)}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Ban IP Address
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#1A1A24]">
        <button
          onClick={() => setActiveTab('ips')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'ips'
              ? 'border-red-500 text-white'
              : 'border-transparent text-[#6B7280] hover:text-white'
          }`}
        >
          Banned IPs ({bannedIPs.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-red-500 text-white'
              : 'border-transparent text-[#6B7280] hover:text-white'
          }`}
        >
          Activity Logs
        </button>
      </div>

      {/* Banned IPs Tab */}
      {activeTab === 'ips' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search IP addresses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500"
            />
          </div>

          {/* IP Table */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1A1A24]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">IP Address</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Banned At</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9CA3AF]">Expires</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[#9CA3AF]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A24]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">
                      Loading...
                    </td>
                  </tr>
                ) : bannedIPs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">
                      No banned IPs
                    </td>
                  </tr>
                ) : (
                  bannedIPs.map((ip) => (
                    <tr key={ip.id} className="hover:bg-[#1A1A24]/50">
                      <td className="px-6 py-4">
                        <code className="text-red-400 bg-red-500/10 px-2 py-1 rounded">
                          {ip.ip_address}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">{ip.reason || '-'}</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">{formatDate(ip.created_at)}</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">
                        {ip.expires_at ? formatDate(ip.expires_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUnbanIP(ip.id, ip.ip_address)}
                          className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-sm transition-colors"
                        >
                          Unban
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-[#9CA3AF]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
          <div className="divide-y divide-[#1A1A24] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-[#6B7280]">Loading...</div>
            ) : activityLogs.length === 0 ? (
              <div className="p-6 text-center text-[#6B7280]">No activity logs yet</div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-[#1A1A24]/50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#1A1A24] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {log.user?.name || 'Unknown User'}
                        </span>
                        <span className="text-[#6B7280] text-sm">
                          {log.user?.email}
                        </span>
                      </div>
                      <p className="text-[#9CA3AF] mt-1">{log.action}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs text-[#6B7280] bg-[#1A1A24] p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#6B7280] text-sm">{formatTimeAgo(log.created_at)}</p>
                      <p className="text-[#4B5563] text-xs">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Ban IP Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Ban IP Address</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">IP Address *</label>
                <input
                  type="text"
                  value={banForm.ip_address}
                  onChange={(e) => setBanForm(f => ({ ...f, ip_address: e.target.value }))}
                  placeholder="192.168.1.1"
                  className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Reason</label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for banning..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Expires (optional)</label>
                <input
                  type="datetime-local"
                  value={banForm.expires_at}
                  onChange={(e) => setBanForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white focus:outline-none focus:border-red-500"
                />
                <p className="text-xs text-[#6B7280] mt-1">Leave empty for permanent ban</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBanModal(false)}
                className="flex-1 px-4 py-3 bg-[#1A1A24] text-white rounded-xl hover:bg-[#2A2A3C] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBanIP}
                disabled={banning || !banForm.ip_address}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {banning ? 'Banning...' : 'Ban IP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
