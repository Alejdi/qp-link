'use client'

import { useState, useEffect } from 'react'

interface AnalyticsData {
  summary: {
    totalUsers: number
    totalProducts: number
    totalRevenue: number
    activeUsersToday: number
  }
  charts: {
    labels: string[]
    registrations: number[]
    logins: number[]
    products: number[]
    revenue: number[]
  }
  geography: { country: string; count: number }[]
  subscriptions: { tier: string; count: number }[]
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`)
        if (res.ok) {
          const analyticsData = await res.json()
          setData(analyticsData)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Simple bar chart renderer
  const renderBarChart = (data: number[], labels: string[], color: string, maxHeight: number = 120) => {
    const maxValue = Math.max(...data, 1)
    return (
      <div className="flex items-end gap-1 h-[140px] pt-4">
        {data.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full rounded-t ${color} transition-all duration-300`}
              style={{ height: `${(value / maxValue) * maxHeight}px`, minHeight: value > 0 ? '4px' : '0' }}
              title={`${labels[index]}: ${value}`}
            />
            {index % 5 === 0 && (
              <span className="text-[10px] text-[#6B7280] mt-1 rotate-45 origin-left">{labels[index]}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Donut chart for subscriptions
  const renderDonutChart = (subscriptions: { tier: string; count: number }[]) => {
    const total = subscriptions.reduce((sum, s) => sum + s.count, 0)
    if (total === 0) return <div className="text-[#6B7280] text-center py-8">No data</div>

    const colors: Record<string, string> = {
      free: '#6B7280',
      starter: '#3B82F6',
      pro: '#8B5CF6',
      enterprise: '#F59E0B',
    }

    let currentAngle = 0
    const segments = subscriptions.map(s => {
      const percentage = (s.count / total) * 100
      const angle = (percentage / 100) * 360
      const segment = { ...s, percentage, startAngle: currentAngle, angle }
      currentAngle += angle
      return segment
    })

    return (
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {segments.map((segment, index) => {
              const radius = 40
              const circumference = 2 * Math.PI * radius
              const strokeDasharray = (segment.angle / 360) * circumference
              const strokeDashoffset = -(segment.startAngle / 360) * circumference

              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={colors[segment.tier] || '#6B7280'}
                  strokeWidth="20"
                  strokeDasharray={`${strokeDasharray} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {subscriptions.map((s, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[s.tier] || '#6B7280' }}
              />
              <span className="text-[#9CA3AF] text-sm capitalize">{s.tier}</span>
              <span className="text-white font-medium">{s.count}</span>
              <span className="text-[#6B7280] text-xs">
                ({((s.count / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-[#9CA3AF] mt-1">Platform performance and insights</p>
          </div>
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
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-[#9CA3AF] mt-1">Platform performance and insights</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-[#1A1A24] border border-[#2A2A3C] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Total Users</p>
          <p className="text-3xl font-bold text-white mt-1">
            {data?.summary.totalUsers.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Active Today</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            {data?.summary.activeUsersToday.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Total Invoices</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">
            {data?.summary.totalProducts.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <p className="text-[#9CA3AF] text-sm">Total Invoice Value</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">
            {formatCurrency(data?.summary.totalRevenue || 0)}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Chart */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Registrations</h3>
          {data?.charts && renderBarChart(data.charts.registrations, data.charts.labels, 'bg-blue-500')}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Total in period:</span>
            <span className="text-white font-medium">
              {data?.charts.registrations.reduce((a, b) => a + b, 0) || 0}
            </span>
          </div>
        </div>

        {/* Logins Chart */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Logins</h3>
          {data?.charts && renderBarChart(data.charts.logins, data.charts.labels, 'bg-green-500')}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Total in period:</span>
            <span className="text-white font-medium">
              {data?.charts.logins.reduce((a, b) => a + b, 0) || 0}
            </span>
          </div>
        </div>

        {/* Invoices Created Chart */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Invoices Created</h3>
          {data?.charts && renderBarChart(data.charts.products, data.charts.labels, 'bg-purple-500')}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Total in period:</span>
            <span className="text-white font-medium">
              {data?.charts.products.reduce((a, b) => a + b, 0) || 0}
            </span>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Invoice Value Created</h3>
          {data?.charts && renderBarChart(data.charts.revenue, data.charts.labels, 'bg-yellow-500')}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Total in period:</span>
            <span className="text-white font-medium">
              {formatCurrency(data?.charts.revenue.reduce((a, b) => a + b, 0) || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Users by Country</h3>
          {data?.geography && data.geography.length > 0 ? (
            <div className="space-y-3">
              {data.geography.map((geo, index) => {
                const maxCount = data.geography[0]?.count || 1
                const percentage = (geo.count / maxCount) * 100
                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-[#9CA3AF] w-24 truncate">{geo.country}</span>
                    <div className="flex-1 h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-12 text-right">{geo.count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-[#6B7280] text-center py-8">No geography data available</div>
          )}
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Breakdown</h3>
          {data?.subscriptions && renderDonutChart(data.subscriptions)}
        </div>
      </div>
    </div>
  )
}
