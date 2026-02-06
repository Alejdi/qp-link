'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  usersThisMonth: number
  totalProducts: number
  activeUsersNow: number
  bannedUsers: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  created_at: string
  role: string
  is_banned: boolean
}

interface RecentActivity {
  id: string
  user_id: string
  action: string
  details: any
  created_at: string
  user?: { name: string; email: string }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/admin/stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        // Fetch recent users
        const usersRes = await fetch('/api/admin/users?limit=5&sort=created_at&order=desc')
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setRecentUsers(usersData.users || [])
        }

        // Fetch recent activity
        const activityRes = await fetch('/api/admin/activity?limit=10')
        if (activityRes.ok) {
          const activityData = await activityRes.json()
          setRecentActivity(activityData.activities || [])
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: `+${stats?.usersToday || 0} today`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'blue',
      href: '/admin/users',
    },
    {
      title: 'Active Now',
      value: stats?.activeUsersNow || 0,
      change: 'Live',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'green',
      href: '/admin/realtime',
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      change: 'Invoices created',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'purple',
      href: '/admin/products',
    },
    {
      title: 'Banned Users',
      value: stats?.bannedUsers || 0,
      change: 'Suspended accounts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      color: 'red',
      href: '/admin/security',
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-[#9CA3AF] mt-1">Welcome back! Here's what's happening with QP Link.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className={`p-6 rounded-2xl border ${colorClasses[card.color].border} ${colorClasses[card.color].bg} hover:scale-[1.02] transition-transform cursor-pointer`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#9CA3AF] text-sm">{card.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{card.value.toLocaleString()}</p>
                  <p className={`text-xs mt-2 ${colorClasses[card.color].text}`}>{card.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[card.color].bg} ${colorClasses[card.color].text}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1A1A24] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
            <Link href="/admin/users" className="text-sm text-red-400 hover:text-red-300">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#1A1A24]">
            {loading ? (
              <div className="p-6 text-center text-[#9CA3AF]">Loading...</div>
            ) : recentUsers.length === 0 ? (
              <div className="p-6 text-center text-[#9CA3AF]">No users yet</div>
            ) : (
              recentUsers.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`}>
                  <div className="px-6 py-4 hover:bg-[#1A1A24] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{user.name || 'Unknown'}</p>
                          {user.is_banned && (
                            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Banned</span>
                          )}
                          {user.role === 'admin' && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">Admin</span>
                          )}
                        </div>
                        <p className="text-[#9CA3AF] text-sm truncate">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#9CA3AF] text-xs">{formatTimeAgo(user.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1A1A24] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/admin/security" className="text-sm text-red-400 hover:text-red-300">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#1A1A24] max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-[#9CA3AF]">Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div className="p-6 text-center text-[#9CA3AF]">No activity yet</div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#1A1A24] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{activity.user?.name || 'Unknown user'}</span>
                        {' '}
                        <span className="text-[#9CA3AF]">{activity.action}</span>
                      </p>
                      <p className="text-[#6B7280] text-xs mt-1">{formatTimeAgo(activity.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <button className="w-full p-4 bg-[#1A1A24] hover:bg-[#2A2A3C] rounded-xl text-center transition-colors">
              <svg className="w-6 h-6 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm text-white">Manage Users</span>
            </button>
          </Link>
          <Link href="/admin/security">
            <button className="w-full p-4 bg-[#1A1A24] hover:bg-[#2A2A3C] rounded-xl text-center transition-colors">
              <svg className="w-6 h-6 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-sm text-white">Ban IP</span>
            </button>
          </Link>
          <Link href="/admin/analytics">
            <button className="w-full p-4 bg-[#1A1A24] hover:bg-[#2A2A3C] rounded-xl text-center transition-colors">
              <svg className="w-6 h-6 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm text-white">View Analytics</span>
            </button>
          </Link>
          <Link href="/admin/realtime">
            <button className="w-full p-4 bg-[#1A1A24] hover:bg-[#2A2A3C] rounded-xl text-center transition-colors">
              <svg className="w-6 h-6 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm text-white">Live Monitoring</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
