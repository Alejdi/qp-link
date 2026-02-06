'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ActiveUser {
  id: string
  name: string
  email: string
  currentPage: string
  lastActive: string
  country: string
}

interface RealtimeData {
  stats: {
    onlineNow: number
    activeSessions: number
  }
  activeUsers: ActiveUser[]
  recentActivity: {
    id: string
    userId: string
    action: string
    details: any
    createdAt: string
    user?: { name: string; email: string }
  }[]
  pageDistribution: { page: string; count: number }[]
  countryDistribution: { country: string; count: number }[]
}

export default function AdminRealtime() {
  const [data, setData] = useState<RealtimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchData()

    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/realtime')
      if (res.ok) {
        const realtimeData = await res.json()
        setData(realtimeData)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 10) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getPageIcon = (page: string) => {
    if (page.includes('dashboard')) return '📊'
    if (page.includes('invoice')) return '📄'
    if (page.includes('settings')) return '⚙️'
    if (page.includes('wallet')) return '💰'
    if (page.includes('contract')) return '📝'
    return '📱'
  }

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Real-time Monitoring</h1>
          <p className="text-[#9CA3AF] mt-1">Live user activity tracking</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Real-time Monitoring</h1>
          <p className="text-[#9CA3AF] mt-1">
            Live user activity tracking
            {lastUpdated && (
              <span className="ml-2 text-[#6B7280]">
                • Updated {formatTimeAgo(lastUpdated.toISOString())}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-red-500 bg-[#1A1A24] border-[#2A2A3C] rounded focus:ring-red-500"
            />
            <span className="text-[#9CA3AF] text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D0D12] rounded-2xl border border-green-500/30 p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-[#9CA3AF] text-sm">Online Now</p>
          </div>
          <p className="text-4xl font-bold text-green-400 mt-2">
            {data?.stats.onlineNow || 0}
          </p>
          <p className="text-[#6B7280] text-xs mt-1">Active in last 5 minutes</p>
        </div>

        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Active Sessions</p>
          <p className="text-4xl font-bold text-white mt-2">
            {data?.stats.activeSessions || 0}
          </p>
        </div>

        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Most Popular Page</p>
          <p className="text-2xl font-bold text-white mt-2 truncate">
            {data?.pageDistribution[0]?.page || 'N/A'}
          </p>
          <p className="text-[#6B7280] text-xs mt-1">
            {data?.pageDistribution[0]?.count || 0} users
          </p>
        </div>

        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Countries Active</p>
          <p className="text-4xl font-bold text-white mt-2">
            {data?.countryDistribution.length || 0}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Users List */}
        <div className="lg:col-span-2 bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1A1A24] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Active Users
              <span className="ml-2 text-green-400 text-sm">
                ({data?.activeUsers.length || 0} online)
              </span>
            </h2>
          </div>
          <div className="divide-y divide-[#1A1A24] max-h-[400px] overflow-y-auto">
            {data?.activeUsers.length === 0 ? (
              <div className="p-6 text-center text-[#6B7280]">No users online</div>
            ) : (
              data?.activeUsers.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`}>
                  <div className="px-6 py-4 hover:bg-[#1A1A24] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D12]"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{user.name || 'Unknown'}</p>
                        <p className="text-[#6B7280] text-sm truncate">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                          <span>{getPageIcon(user.currentPage)}</span>
                          <span className="truncate max-w-[120px]">{user.currentPage}</span>
                        </div>
                        <p className="text-[#6B7280] text-xs mt-0.5">
                          {formatTimeAgo(user.lastActive)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          {/* Page Distribution */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Page Distribution</h3>
            <div className="space-y-3">
              {data?.pageDistribution.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-lg">{getPageIcon(item.page)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#9CA3AF] text-sm truncate">{item.page}</p>
                  </div>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
              ))}
              {(!data?.pageDistribution || data.pageDistribution.length === 0) && (
                <p className="text-[#6B7280] text-sm">No data</p>
              )}
            </div>
          </div>

          {/* Country Distribution */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Countries</h3>
            <div className="space-y-3">
              {data?.countryDistribution.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]">{item.country}</span>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
              ))}
              {(!data?.countryDistribution || data.countryDistribution.length === 0) && (
                <p className="text-[#6B7280] text-sm">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1A1A24]">
          <h2 className="text-lg font-semibold text-white">Live Activity Stream</h2>
        </div>
        <div className="divide-y divide-[#1A1A24] max-h-[300px] overflow-y-auto">
          {data?.recentActivity.length === 0 ? (
            <div className="p-6 text-center text-[#6B7280]">No recent activity</div>
          ) : (
            data?.recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-3 hover:bg-[#1A1A24]/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-white text-sm font-medium">
                    {activity.user?.name || 'Unknown'}
                  </span>
                  <span className="text-[#6B7280] text-sm">{activity.action}</span>
                  <span className="text-[#4B5563] text-xs ml-auto">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
