'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useCards } from '@/contexts/CardsContext'
import { useWallet } from '@/contexts/WalletContext'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  price: string | number
  _count: {
    payments: number
  }
}

interface MonthlyData {
  month: string
  monthShort: string
  year: number
  key: string
  in: number
  out: number
  net: number
  count: number
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { cards } = useCards()
  const { wallet, stats, escrow, recentTransactions, loading: walletLoading } = useWallet()
  const { data: session } = useSession()
  const userName = session?.user?.name || 'User'
  const [products, setProducts] = useState<Product[]>([])
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [activeInvoices, setActiveInvoices] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'pie' | 'sphere'>('bar')
  const [selectedPeriod, setSelectedPeriod] = useState(3) // months

  useEffect(() => {
    // Fetch products on client side
    async function loadProducts() {
      try {
        const res = await fetch('/api/products')
        if (res.ok) {
          const data = await res.json()
          const productsList = data.products || []
          setProducts(productsList)

          // Calculate real statistics
          const total = productsList.length
          const active = productsList.filter((p: any) => p.is_active).length
          const value = productsList.reduce((sum: number, p: Product) => sum + Number(p.price), 0)

          setTotalInvoices(total)
          setActiveInvoices(active)
          setTotalValue(value)
        }
      } catch (error) {
        // Use default values (all 0)
      }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    // Fetch analytics data
    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/analytics/monthly?months=${selectedPeriod}`)
        if (res.ok) {
          const data = await res.json()
          setMonthlyData(data.monthly || [])
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setAnalyticsLoading(false)
      }
    }
    loadAnalytics()
  }, [selectedPeriod])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(price)
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Total Balance Card */}
          <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <p className={`text-[13px] mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Total Balance</p>
                <h2 className={`text-[28px] sm:text-[36px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                  {walletLoading ? (
                    <span className="animate-pulse">€0.00</span>
                  ) : (
                    formatPrice(wallet?.balance || 0)
                  )}
                </h2>
                {((wallet?.pendingBalance && wallet.pendingBalance > 0) || (wallet?.frozenBalance && wallet.frozenBalance > 0) || (escrow && escrow.heldCount > 0)) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {wallet?.pendingBalance && wallet.pendingBalance > 0 && (
                      <p className={`text-[11px] ${isDark ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                        + {formatPrice(wallet.pendingBalance)} pending
                      </p>
                    )}
                    {wallet?.frozenBalance && wallet.frozenBalance > 0 && (
                      <p className={`text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        🔒 {formatPrice(wallet.frozenBalance)} in escrow
                      </p>
                    )}
                    {escrow && escrow.heldCount > 0 && (
                      <Link href="/dashboard/escrow" className={`text-[11px] ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} underline`}>
                        View {escrow.heldCount} escrow{escrow.heldCount > 1 ? 's' : ''}
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'border border-[#E5E7EB] text-[#21255B] hover:bg-[#F1F2F3]'}`}>
                  <span className="text-[14px]">🇪🇺</span>
                  <span className="hidden xs:inline">EUR</span>
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Link href="/dashboard/withdrawal">
                  <button className="px-3 sm:px-4 py-2 bg-[#B8EDFD] text-[#21255B] rounded-lg text-[12px] font-semibold hover:bg-[#a0e5fc] transition-colors">
                    Withdraw
                  </button>
                </Link>
              </div>
            </div>

            {/* My Wallet Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>My Wallet</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowWalletMenu(!showWalletMenu)}
                    className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF]' : 'hover:bg-[#F1F2F3] text-[#6B7280]'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </button>

                  {showWalletMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowWalletMenu(false)}></div>
                      <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
                        <div className="py-1">
                          <Link href="/dashboard/qp-card">
                            <button className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-gray-300 hover:bg-[#2A2A3C]' : 'text-gray-700 hover:bg-gray-100'}`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                              </svg>
                              Manage Cards
                            </button>
                          </Link>
                          <Link href="/dashboard/qp-card">
                            <button className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-gray-300 hover:bg-[#2A2A3C]' : 'text-gray-700 hover:bg-gray-100'}`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Add New Card
                            </button>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Credit Cards */}
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                {cards.map((card, index) => {
                  const isPrimary = card.cardType === 'primary'
                  const firstName = card.holderName.split(' ')[0]
                  const lastName = card.holderName.split(' ')[1] || ''
                  const lastFourDigits = card.cardNumber.replace(/\s/g, '').slice(-4)
                  const maskedNumber = `•••• •••• •••• ${lastFourDigits}`

                  return (
                    <div
                      key={card.id}
                      className={`min-w-[240px] sm:min-w-[260px] h-[140px] sm:h-[155px] rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-lg ${
                        isPrimary
                          ? 'bg-gradient-to-br from-[#21255B] to-[#1a1e4a] text-white card-shimmer'
                          : isDark
                            ? 'bg-gradient-to-br from-[#3A3A4C] to-[#2A2A3C] text-white'
                            : 'bg-gradient-to-br from-[#F1F2F3] to-[#E5E7EB] text-[#6B7280] border border-[#E5E7EB]'
                      }`}
                    >
                      {/* Card decorations */}
                      {isPrimary && (
                        <>
                          <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -mr-14 -mt-14"></div>
                          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-18 -mb-18"></div>
                          <div className="absolute top-1/2 right-4 w-20 h-20 bg-white/5 rounded-full"></div>
                        </>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[13px] font-bold tracking-[0.2em] ${isPrimary ? '' : isDark ? 'opacity-70' : 'opacity-50'}`}>QP LINK</span>
                          <svg className={`w-5 h-5 ${isPrimary ? 'opacity-70' : isDark ? 'opacity-50' : 'opacity-30'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                          </svg>
                        </div>
                      </div>

                      <div className="relative z-10">
                        <p className={`text-[14px] font-semibold mb-0.5 ${isPrimary ? '' : isDark ? 'text-white/70' : 'text-[#6B7280]'}`}>{firstName}</p>
                        <p className={`text-[15px] font-medium tracking-[0.15em] ${isPrimary ? 'opacity-90' : isDark ? 'opacity-60' : 'opacity-50'}`}>{lastName}</p>
                        <p className={`text-[12px] mt-1 tracking-wider ${isPrimary ? 'opacity-60' : isDark ? 'opacity-40' : 'opacity-40'}`}>{maskedNumber}</p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex gap-1">
                          <div className={`w-7 h-5 rounded-sm flex items-center justify-center ${isPrimary ? 'bg-yellow-400/80' : isDark ? 'bg-gray-500/50' : 'bg-gray-300/80'}`}>
                            <div className={`w-5 h-3 border rounded-sm ${isPrimary ? 'border-yellow-600/50' : isDark ? 'border-gray-400/30' : 'border-gray-400/50'}`}></div>
                          </div>
                          {isPrimary && (
                            <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                            </svg>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-[9px] tracking-wide ${isPrimary ? 'opacity-60' : isDark ? 'opacity-50' : 'opacity-40'}`}>CVC</p>
                          <p className={`text-[12px] font-medium ${isPrimary ? 'opacity-80' : isDark ? 'opacity-50' : 'opacity-40'}`}>{card.cvc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Recent Transactions</h3>
              <Link href="/dashboard/transactions">
                <button className="text-[12px] text-[#B8EDFD] font-medium hover:underline">View all</button>
              </Link>
            </div>

            <div className="space-y-1">
              {recentTransactions.length === 0 ? (
                <div className={`flex items-center justify-center py-8 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  <div className="text-center">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                    <p className="text-[12px]">No transactions yet</p>
                  </div>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-[#2A2A3C]' : 'hover:bg-[#F8F8F8]'}`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.direction === 'in'
                          ? 'bg-green-500/10'
                          : 'bg-red-500/10'
                      }`}>
                        <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${tx.direction === 'in' ? 'text-green-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {tx.direction === 'in' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                          )}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[12px] sm:text-[13px] font-semibold truncate ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                          {tx.description || tx.type.replace('_', ' ')}
                        </p>
                        <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[13px] sm:text-[14px] font-bold ${tx.direction === 'in' ? 'text-green-500' : isDark ? 'text-white' : 'text-[#21255B]'}`}>
                        {tx.direction === 'in' ? '+' : '-'}{formatPrice(tx.netAmount)}
                      </p>
                      <p className={`text-[10px] sm:text-[11px] font-semibold ${
                        tx.status === 'completed' ? 'text-[#10B981]' :
                        tx.status === 'pending' ? 'text-yellow-500' : 'text-[#EF4444]'
                      }`}>
                        {tx.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Wallet Stats */}
            <div className={`mt-6 pt-5 ${isDark ? 'border-t border-[#2A2A3C]' : 'border-t border-[#E5E7EB]'}`}>
              <h3 className={`text-[13px] font-semibold mb-3 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Total Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-[10px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Money In</p>
                  <p className="text-[14px] font-bold text-green-500">{formatPrice(stats?.totalIn || 0)}</p>
                </div>
                <div>
                  <p className={`text-[10px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Money Out</p>
                  <p className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>{formatPrice(stats?.totalOut || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Statistics */}
        <div className="col-span-12 lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Statistics Card */}
          <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Statistics</h3>
              <button className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF]' : 'hover:bg-[#F1F2F3] text-[#6B7280]'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <h4 className={`text-[24px] sm:text-[28px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                  {analyticsLoading ? (
                    <span className="animate-pulse">€0.00</span>
                  ) : (
                    formatPrice(monthlyData.reduce((sum, m) => sum + m.in, 0))
                  )}
                </h4>
                {monthlyData.length > 0 && monthlyData.reduce((sum, m) => sum + m.in, 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#10B981]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    {monthlyData.length > 1 ? Math.round(((monthlyData[monthlyData.length - 1].in - monthlyData[0].in) / (monthlyData[0].in || 1)) * 100) : 0}%
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-[#2A2A3C]' : 'bg-[#F1F2F3]'} overflow-x-auto`}>
                  <button
                    onClick={() => setSelectedChartType('bar')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap ${selectedChartType === 'bar' ? (isDark ? 'bg-[#21255B] text-white' : 'bg-white text-[#21255B] shadow-sm') : (isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]')}`}>
                    Bar Chart
                  </button>
                  <button
                    onClick={() => setSelectedChartType('pie')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap ${selectedChartType === 'pie' ? (isDark ? 'bg-[#21255B] text-white' : 'bg-white text-[#21255B] shadow-sm') : (isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]')}`}>
                    Pie Chart
                  </button>
                  <button
                    onClick={() => setSelectedChartType('sphere')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap ${selectedChartType === 'sphere' ? (isDark ? 'bg-[#21255B] text-white' : 'bg-white text-[#21255B] shadow-sm') : (isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]')}`}>
                    AI Sphere
                  </button>
                </div>
                <button
                  onClick={() => setSelectedPeriod(selectedPeriod === 3 ? 6 : selectedPeriod === 6 ? 12 : 3)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>
                  <span className="hidden sm:inline">
                    {monthlyData.length > 0 ? `${monthlyData[0].month} - ${monthlyData[monthlyData.length - 1].month}` : 'Select Period'}
                  </span>
                  <span className="sm:hidden">
                    {monthlyData.length > 0 ? `${monthlyData[0].monthShort} - ${monthlyData[monthlyData.length - 1].monthShort}` : 'Period'}
                  </span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chart Visualization */}
            {selectedChartType === 'sphere' ? (
              <div className="relative h-32 flex items-center justify-center mb-4">
                <div className="sphere-float">
                  <div className={`w-24 h-24 rounded-full relative ${isDark ? 'bg-gradient-to-br from-[#3A3A4C] via-[#2A2A3C] to-[#1A1A24]' : 'bg-gradient-to-br from-[#E5E7EB] via-[#D1D5DB] to-[#9CA3AF]'}`} style={{boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4), inset 0 -10px 30px rgba(255,255,255,0.05)' : '0 20px 40px rgba(0,0,0,0.15), inset 0 -10px 30px rgba(255,255,255,0.3)'}}>
                    {/* Sphere highlights */}
                    <div className="absolute top-3 left-4 w-6 h-4 bg-white/20 rounded-full blur-sm"></div>
                    <div className="absolute top-5 left-6 w-3 h-2 bg-white/30 rounded-full blur-[1px]"></div>
                    {/* Expand icon */}
                    <button className={`absolute -right-2 -top-2 p-1.5 rounded-lg ${isDark ? 'bg-[#2A2A3C]' : 'bg-white shadow-md'}`}>
                      <svg className={`w-3 h-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedChartType === 'bar' ? (
              <div className="h-32 flex items-end gap-[3px] mb-4">
                {analyticsLoading ? (
                  Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm animate-pulse ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}
                      style={{ height: `${Math.random() * 60 + 20}%` }}
                    ></div>
                  ))
                ) : monthlyData.length > 0 ? (
                  (() => {
                    const maxValue = Math.max(...monthlyData.map(m => m.in), 1)
                    return monthlyData.map((month, i) => {
                      const height = (month.in / maxValue) * 100
                      return (
                        <div
                          key={month.key}
                          className={`flex-1 rounded-t-sm chart-bar transition-all ${isDark ? 'bg-[#B8EDFD]/30 hover:bg-[#B8EDFD]' : 'bg-[#21255B]/20 hover:bg-[#21255B]'}`}
                          style={{ height: `${height || 5}%` }}
                          title={`${month.month}: ${formatPrice(month.in)}`}
                        ></div>
                      )
                    })
                  })()
                ) : (
                  Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}
                      style={{ height: '10%' }}
                    ></div>
                  ))
                )}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  {analyticsLoading ? (
                    <div className={`w-full h-full rounded-full animate-pulse ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}></div>
                  ) : monthlyData.length > 0 ? (
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const total = monthlyData.reduce((sum, m) => sum + m.in, 0)
                        let currentAngle = 0
                        const colors = ['#B8EDFD', '#21255B', '#9CA3AF', '#6B7280', '#4B5563']

                        return monthlyData.map((month, i) => {
                          const percentage = total > 0 ? (month.in / total) * 100 : 0
                          const angle = (percentage / 100) * 360
                          const startAngle = currentAngle
                          currentAngle += angle

                          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                          const x2 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180)
                          const y2 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180)
                          const largeArc = angle > 180 ? 1 : 0

                          return (
                            <path
                              key={month.key}
                              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[i % colors.length]}
                              opacity={isDark ? 0.8 : 0.7}
                            />
                          )
                        })
                      })()}
                    </svg>
                  ) : (
                    <div className={`w-full h-full rounded-full ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              </div>
            )}

            <div className={`pt-4 space-y-3 ${isDark ? 'border-t border-[#2A2A3C]' : 'border-t border-[#E5E7EB]'}`}>
              {analyticsLoading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span className={`animate-pulse h-3 w-16 rounded ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}></span>
                      <span className={`animate-pulse h-3 w-12 rounded ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200'}`}></span>
                    </div>
                  ))}
                </>
              ) : monthlyData.length > 0 ? (
                monthlyData.map((month) => (
                  <div key={month.key} className="flex items-center justify-between text-[12px]">
                    <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>{month.month}</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>{formatPrice(month.in)}</span>
                  </div>
                ))
              ) : (
                <>
                  {['January', 'February', 'March'].map(month => (
                    <div key={month} className="flex items-center justify-between text-[12px]">
                      <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>{month}</span>
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>€0.00</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Contracts */}
          <div className={`rounded-2xl p-4 sm:p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Contracts (2)</h3>
              <Link href="/dashboard/contracts">
                <button className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-[#2A2A3C] text-[#B8EDFD] hover:bg-[#3A3A4C]' : 'border border-[#E5E7EB] text-[#21255B] hover:bg-[#F1F2F3]'}`}>
                  Create a Contract
                </button>
              </Link>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {/* Contract 1 */}
              <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-[#2A2A3C]' : 'hover:bg-[#F8F8F8]'}`}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[12px] sm:text-[13px] font-semibold truncate ${isDark ? 'text-white' : 'text-[#21255B]'}`}>{userName}</p>
                    <span className={`text-[9px] sm:text-[10px] whitespace-nowrap ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>No work</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] sm:text-[10px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>MONTHLY</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    <span className="text-[9px] sm:text-[10px] text-[#10B981] font-semibold">ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Contract 2 */}
              <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-[#2A2A3C]' : 'hover:bg-[#F8F8F8]'}`}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[12px] sm:text-[13px] font-semibold truncate ${isDark ? 'text-white' : 'text-[#21255B]'}`}>{userName}</p>
                    <span className={`text-[9px] sm:text-[10px] whitespace-nowrap ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>12h 30m</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] sm:text-[10px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>PAY AS YOU GO</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    <span className="text-[9px] sm:text-[10px] text-[#10B981] font-semibold">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-4 pt-4 text-right ${isDark ? 'border-t border-[#2A2A3C]' : 'border-t border-[#E5E7EB]'}`}>
              <p className={`text-[10px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>This week</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
