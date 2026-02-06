'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  is_banned: boolean
  ban_reason: string | null
  subscription_tier: string
  kyc_status: string
  phone_number: string | null
  last_active: string | null
  current_page: string | null
  created_at: string
  login_count: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const limit = 20

  // Ban modal state
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, statusFilter, page])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      if (search) params.append('search', search)
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedUser.is_banned ? 'unban' : 'ban',
          reason: banReason,
        }),
      })

      if (res.ok) {
        setBanModalOpen(false)
        setSelectedUser(null)
        setBanReason('')
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to ban/unban user:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const openBanModal = (user: User) => {
    setSelectedUser(user)
    setBanReason(user.ban_reason || '')
    setBanModalOpen(true)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const timeAgo = (date: string | null) => {
    if (!date) return 'Never'
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-[#9CA3AF] mt-1">Manage all platform users</p>
        </div>
        <div className="text-sm text-[#9CA3AF]">
          Total: <span className="text-white font-semibold">{total}</span> users
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0) }}
            className="px-4 py-2.5 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white focus:outline-none focus:border-red-500"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
            className="px-4 py-2.5 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white focus:outline-none focus:border-red-500"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1A1A24]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A24]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#9CA3AF]">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#9CA3AF]">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1A1A24]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{user.name || 'Unknown'}</p>
                            {user.role === 'admin' && (
                              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">Admin</span>
                            )}
                          </div>
                          <p className="text-[#9CA3AF] text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                        user.subscription_tier === 'pro'
                          ? 'bg-blue-500/20 text-blue-400'
                          : user.subscription_tier === 'starter'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-[#2A2A3C] text-[#9CA3AF]'
                      }`}>
                        {(user.subscription_tier || 'free').charAt(0).toUpperCase() + (user.subscription_tier || 'free').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm">{timeAgo(user.last_active)}</p>
                        {user.current_page && (
                          <p className="text-[#6B7280] text-xs">{user.current_page}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#9CA3AF] text-sm">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <button className="p-2 text-[#9CA3AF] hover:text-white hover:bg-[#2A2A3C] rounded-lg transition-colors" title="View details">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </Link>
                        <button
                          onClick={() => openBanModal(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_banned
                              ? 'text-green-400 hover:bg-green-500/20'
                              : 'text-red-400 hover:bg-red-500/20'
                          }`}
                          title={user.is_banned ? 'Unban user' : 'Ban user'}
                        >
                          {user.is_banned ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#1A1A24] flex items-center justify-between">
            <p className="text-sm text-[#9CA3AF]">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBanModalOpen(false)} />
          <div className="relative max-w-md w-full bg-[#0D0D12] border border-[#1A1A24] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              {selectedUser.is_banned ? 'Unban User' : 'Ban User'}
            </h3>
            <p className="text-[#9CA3AF] mb-4">
              {selectedUser.is_banned
                ? `Are you sure you want to unban ${selectedUser.name || selectedUser.email}?`
                : `Ban ${selectedUser.name || selectedUser.email} from the platform?`}
            </p>

            {!selectedUser.is_banned && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Reason for ban
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setBanModalOpen(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading || (!selectedUser.is_banned && !banReason)}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                  selectedUser.is_banned
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionLoading ? 'Processing...' : selectedUser.is_banned ? 'Unban' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
