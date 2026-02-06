'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  subscription_tier: string
  subscription_expires_at: string | null
  kyc_status: string
  id_verified: boolean
  id_front_url: string | null
  id_back_url: string | null
  phone_number: string | null
  phone_verified: boolean
  last_active: string | null
  current_page: string | null
  last_login_at: string | null
  last_login_ip: string | null
  login_count: number
  created_at: string
}

interface Product {
  id: string
  name: string
  price: number
  short_code: string
  created_at: string
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Modal states
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [kycModalOpen, setKycModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    fetchUser()
  }, [params.id])

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setProducts(data.products || [])
        setProductsCount(data.productsCount || 0)
      } else {
        router.push('/admin/users')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    if (!user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: user.is_banned ? 'unban' : 'ban',
          reason: banReason,
        }),
      })

      if (res.ok) {
        setBanModalOpen(false)
        setBanReason('')
        fetchUser()
      }
    } catch (error) {
      console.error('Failed to ban/unban user:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleKycAction = async (action: 'approve' | 'reject') => {
    if (!user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_status: action === 'approve' ? 'approved' : 'rejected',
          id_verified: action === 'approve',
        }),
      })

      if (res.ok) {
        setKycModalOpen(false)
        fetchUser()
      }
    } catch (error) {
      console.error('Failed to update KYC:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        fetchUser()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user || !newPassword) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      if (res.ok) {
        setPasswordModalOpen(false)
        setNewPassword('')
        alert('Password reset successfully')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
      alert('Failed to reset password')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!user || !newEmail) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      })

      if (res.ok) {
        setEmailModalOpen(false)
        setNewEmail('')
        fetchUser()
        alert('Email updated successfully')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update email')
      }
    } catch (error) {
      console.error('Failed to update email:', error)
      alert('Failed to update email')
    } finally {
      setActionLoading(false)
    }
  }

  const fetchSessions = async () => {
    if (!user) return

    try {
      const res = await fetch(`/api/admin/users/${user.id}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const handleRevokeSessions = async () => {
    if (!user) return
    if (!confirm('Revoke all active sessions? This will log the user out everywhere.')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/sessions`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('All sessions revoked successfully')
        fetchSessions()
      } else {
        alert('Failed to revoke sessions')
      }
    } catch (error) {
      console.error('Failed to revoke sessions:', error)
      alert('Failed to revoke sessions')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#9CA3AF]">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#9CA3AF]">User not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 bg-[#1A1A24] hover:bg-[#2A2A3C] rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">{user.name || 'Unknown User'}</h1>
          <p className="text-[#9CA3AF]">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-white">{user.name || 'Unknown'}</h2>
                    {user.role === 'admin' && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">Admin</span>
                    )}
                    {user.is_banned && (
                      <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Banned</span>
                    )}
                  </div>
                  <p className="text-[#9CA3AF]">{user.email}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-[#1A1A24] border border-[#2A2A3C] rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => setBanModalOpen(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    user.is_banned
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {user.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Phone</p>
                <p className="text-white">{user.phone_number || 'Not provided'}</p>
                {user.phone_verified && (
                  <span className="text-xs text-green-400">Verified</span>
                )}
              </div>
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Subscription</p>
                <p className="text-white capitalize">{user.subscription_tier || 'Free'}</p>
              </div>
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Joined</p>
                <p className="text-white">{formatDate(user.created_at)}</p>
              </div>
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Last Login</p>
                <p className="text-white">{formatDate(user.last_login_at)}</p>
              </div>
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Login Count</p>
                <p className="text-white">{user.login_count || 0} times</p>
              </div>
              <div className="p-4 bg-[#1A1A24] rounded-xl">
                <p className="text-[#9CA3AF] text-xs mb-1">Last IP</p>
                <p className="text-white font-mono text-sm">{user.last_login_ip || 'Unknown'}</p>
              </div>
            </div>

            {/* Ban info */}
            {user.is_banned && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 font-medium mb-1">Account Banned</p>
                <p className="text-[#9CA3AF] text-sm">Reason: {user.ban_reason || 'No reason provided'}</p>
                <p className="text-[#6B7280] text-xs mt-1">Banned on: {formatDate(user.banned_at)}</p>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1A1A24]">
              <h3 className="text-lg font-semibold text-white">Products ({productsCount})</h3>
            </div>
            {products.length === 0 ? (
              <div className="p-6 text-center text-[#9CA3AF]">No products created</div>
            ) : (
              <div className="divide-y divide-[#1A1A24]">
                {products.map((product) => (
                  <div key={product.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-[#9CA3AF] text-sm">{product.short_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">€{product.price}</p>
                      <p className="text-[#6B7280] text-xs">{formatDate(product.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* KYC Status */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">KYC Verification</h3>

            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                user.kyc_status === 'approved'
                  ? 'bg-green-500/20 text-green-400'
                  : user.kyc_status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : user.kyc_status === 'rejected'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-[#2A2A3C] text-[#9CA3AF]'
              }`}>
                {user.kyc_status === 'approved' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {(user.kyc_status || 'not_submitted').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>

            {/* ID Documents */}
            {(user.id_front_url || user.id_back_url) && (
              <div className="space-y-3">
                <p className="text-[#9CA3AF] text-sm">ID Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  {user.id_front_url && (
                    <button
                      onClick={() => setSelectedImage(user.id_front_url)}
                      className="aspect-video bg-[#1A1A24] rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition-all"
                    >
                      <img src={user.id_front_url} alt="ID Front" className="w-full h-full object-cover" />
                    </button>
                  )}
                  {user.id_back_url && (
                    <button
                      onClick={() => setSelectedImage(user.id_back_url)}
                      className="aspect-video bg-[#1A1A24] rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition-all"
                    >
                      <img src={user.id_back_url} alt="ID Back" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>

                {user.kyc_status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleKycAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleKycAction('reject')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {!user.id_front_url && !user.id_back_url && (
              <p className="text-[#6B7280] text-sm">No ID documents uploaded</p>
            )}
          </div>

          {/* Activity */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Activity</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[#9CA3AF] text-xs">Last Active</p>
                <p className="text-white">{formatDate(user.last_active)}</p>
              </div>
              {user.current_page && (
                <div>
                  <p className="text-[#9CA3AF] text-xs">Current Page</p>
                  <p className="text-white font-mono text-sm">{user.current_page}</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Actions */}
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Security Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="w-full px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset Password
              </button>
              <button
                onClick={() => { setNewEmail(user.email); setEmailModalOpen(true); }}
                className="w-full px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Change Email
              </button>
              <button
                onClick={() => { fetchSessions(); setSessionsModalOpen(true); }}
                className="w-full px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Manage Sessions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ban Modal */}
      {banModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBanModalOpen(false)} />
          <div className="relative max-w-md w-full bg-[#0D0D12] border border-[#1A1A24] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              {user.is_banned ? 'Unban User' : 'Ban User'}
            </h3>
            <p className="text-[#9CA3AF] mb-4">
              {user.is_banned
                ? `Are you sure you want to unban ${user.name || user.email}?`
                : `Ban ${user.name || user.email} from the platform?`}
            </p>

            {!user.is_banned && (
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
                disabled={actionLoading || (!user.is_banned && !banReason)}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                  user.is_banned
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionLoading ? 'Processing...' : user.is_banned ? 'Unban' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90" onClick={() => setSelectedImage(null)} />
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={selectedImage} alt="ID Document" className="w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPasswordModalOpen(false)} />
          <div className="relative max-w-md w-full bg-[#0D0D12] border border-[#1A1A24] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Reset Password</h3>
            <p className="text-[#9CA3AF] mb-4">
              Set a new password for {user?.name || user?.email}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPasswordModalOpen(false); setNewPassword(''); }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading || newPassword.length < 8}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEmailModalOpen(false)} />
          <div className="relative max-w-md w-full bg-[#0D0D12] border border-[#1A1A24] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Change Email Address</h3>
            <p className="text-[#9CA3AF] mb-4">
              Update email for {user?.name || 'this user'}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Current Email
              </label>
              <input
                type="text"
                value={user?.email}
                disabled
                className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-gray-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email..."
                className="w-full px-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setEmailModalOpen(false); setNewEmail(''); }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={actionLoading || !newEmail.includes('@') || newEmail === user?.email}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Change Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Management Modal */}
      {sessionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSessionsModalOpen(false)} />
          <div className="relative max-w-2xl w-full bg-[#0D0D12] border border-[#1A1A24] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Active Sessions</h3>
              <button
                onClick={handleRevokeSessions}
                disabled={actionLoading || sessions.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Revoke All
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF]">No active sessions</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <div key={session.id} className="p-4 bg-[#1A1A24] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                          <span className="text-white font-medium">Active</span>
                        </div>
                        {session.ip_address && (
                          <p className="text-sm text-[#9CA3AF] mb-1">
                            IP: <span className="font-mono">{session.ip_address}</span>
                          </p>
                        )}
                        {session.device_type && (
                          <p className="text-sm text-[#9CA3AF] mb-1">Device: {session.device_type}</p>
                        )}
                        {session.current_page && (
                          <p className="text-sm text-[#9CA3AF] mb-1">Page: {session.current_page}</p>
                        )}
                        <p className="text-xs text-[#6B7280] mt-2">
                          Started: {formatDate(session.started_at)}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          Last active: {formatDate(session.last_activity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSessionsModalOpen(false)}
                className="px-4 py-2 bg-[#1A1A24] hover:bg-[#2A2A3C] text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
