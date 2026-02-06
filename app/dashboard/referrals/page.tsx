'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useSession } from 'next-auth/react'

interface Referral {
  id: string
  userId: string
  status: 'signed_up' | 'active' | 'paid_out'
  earnings: number
  dateReferred: string
}

export default function ReferralsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { data: session } = useSession()
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  // Generate referral code from user name or email
  const userName = session?.user?.name || 'User'
  const referralCode = userName.toUpperCase().replace(/\s+/g, '')
  const referralLink = `https://qplink.com/ref/${referralCode}`

  // Mock data - will be replaced with real data
  const stats = {
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarnings: 156.50,
    availableBalance: 85.00,
    conversionRate: 66.7
  }

  const referrals: Referral[] = [
    { id: '1', userId: 'User #1234', status: 'paid_out', earnings: 25.00, dateReferred: '2024-11-15' },
    { id: '2', userId: 'User #5678', status: 'active', earnings: 20.00, dateReferred: '2024-11-20' },
    { id: '3', userId: 'User #9012', status: 'active', earnings: 20.00, dateReferred: '2024-11-22' },
    { id: '4', userId: 'User #3456', status: 'signed_up', earnings: 5.00, dateReferred: '2024-11-25' },
    { id: '5', userId: 'User #7890', status: 'signed_up', earnings: 5.00, dateReferred: '2024-11-28' },
  ]

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToSocial = (platform: string) => {
    const text = `Join me on QP Link and get paid faster! Use my referral link: ${referralLink}`
    const encodedText = encodeURIComponent(text)
    const encodedLink = encodeURIComponent(referralLink)

    const urls: { [key: string]: string } = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`
    }

    window.open(urls[platform], '_blank')
  }

  const getStatusBadge = (status: Referral['status']) => {
    const statusConfig = {
      signed_up: {
        text: 'Signed Up',
        class: isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
      },
      active: {
        text: 'Active',
        class: isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'
      },
      paid_out: {
        text: 'Paid Out',
        class: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
      }
    }

    return statusConfig[status]
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Referrals</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Invite friends and earn rewards together
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Referrals */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Referrals</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalReferrals}</p>
              </div>
            </div>
          </div>

          {/* Active Referrals */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-900/20' : 'bg-green-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Active</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.activeReferrals}</p>
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Earnings</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>€{stats.totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Available Balance */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-900/20' : 'bg-purple-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>€{stats.availableBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Referral Link</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Share this link with your friends</p>
            </div>
            <button
              onClick={() => setShowQR(!showQR)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </button>
          </div>

          {/* Referral Link Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={referralLink}
              readOnly
              className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm ${isDark ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}
            />
            <button
              onClick={copyToClipboard}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* QR Code (placeholder) */}
          {showQR && (
            <div className={`p-4 rounded-lg text-center mb-4 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50'}`}>
              <div className={`w-48 h-48 mx-auto rounded-lg flex items-center justify-center ${isDark ? 'bg-white' : 'bg-white'}`}>
                <p className="text-gray-400 text-sm">QR Code Placeholder</p>
              </div>
            </div>
          )}

          {/* Social Share Buttons */}
          <div>
            <p className={`text-xs font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Share via social media</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => shareToSocial('whatsapp')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30' : 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
              <button
                onClick={() => shareToSocial('twitter')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/30' : 'bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>
              <button
                onClick={() => shareToSocial('facebook')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/30' : 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
              <button
                onClick={() => shareToSocial('linkedin')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#0A66C2]/20 text-[#0A66C2] hover:bg-[#0A66C2]/30' : 'bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
            </div>
          </div>
        </div>

        {/* Reward Structure */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>How Rewards Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50'}`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                <span className={`text-xl font-bold ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`}>1</span>
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Friend Signs Up</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Earn €5 when your friend creates an account using your referral link</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50'}`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-green-900/20' : 'bg-green-100'}`}>
                <span className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>2</span>
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>First Transaction</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Earn €20 more when they create their first invoice or payment link</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50'}`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>
                <span className={`text-xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>3</span>
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Get Paid</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Withdraw your earnings directly to your QP Card wallet anytime</p>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-[#2A2A3C] flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Referral History</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Track your referred users and earnings</p>
            </div>
            {stats.availableBalance >= 25 && (
              <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                Withdraw €{stats.availableBalance.toFixed(2)}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-[#1A1A24]' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>User</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Earnings</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date Referred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#2A2A3C]">
                {referrals.map((referral) => {
                  const statusBadge = getStatusBadge(referral.status)
                  return (
                    <tr key={referral.id} className={`${isDark ? 'hover:bg-[#2A2A3C]/30' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {referral.userId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        €{referral.earnings.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(referral.dateReferred).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {referrals.length === 0 && (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-gray-100'}`}>
                <svg className={`w-8 h-8 ${isDark ? 'text-[#B8EDFD]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No referrals yet</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Start sharing your referral link to earn rewards
              </p>
            </div>
          )}
        </div>

        {/* Minimum Withdrawal Notice */}
        {stats.availableBalance > 0 && stats.availableBalance < 25 && (
          <div className={`mt-4 rounded-lg p-4 ${isDark ? 'bg-yellow-900/20 border border-yellow-900/30' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start gap-3">
              <svg className={`w-5 h-5 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>Minimum withdrawal amount: €25.00</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-yellow-500' : 'text-yellow-700'}`}>
                  You need €{(25 - stats.availableBalance).toFixed(2)} more to withdraw your earnings
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
