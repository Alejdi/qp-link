'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface AnalyticsData {
  summary: {
    totalRevenue: number
    totalPending: number
    totalWithdrawn: number
    currentBalance: number
    frozenBalance: number
    pendingBalance: number
    paidInvoices: number
    unpaidInvoices: number
    averageTransactionValue: number
    successRate: number
    totalInvoices: number
  }
  charts: {
    revenueOverTime: Array<{ date: string; revenue: number }>
    paymentMethods: Array<{ method: string; amount: number }>
  }
  topCustomers: Array<{ email: string; revenue: number }>
  escrowStats: {
    held: number
    released: number
    disputed: number
    totalHeld: number
    averageReleaseTime: number
  }
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const data = await res.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  const revenueChartData = {
    labels: analytics.charts.revenueOverTime.map(d => {
      const date = new Date(d.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }),
    datasets: [
      {
        label: 'Revenue (€)',
        data: analytics.charts.revenueOverTime.map(d => d.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const paymentMethodsData = {
    labels: analytics.charts.paymentMethods.map(pm => pm.method.toUpperCase()),
    datasets: [
      {
        data: analytics.charts.paymentMethods.map(pm => pm.amount),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">Track your revenue and performance</p>
          </div>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[#1A1A24] text-white px-4 py-2 rounded-lg border border-[#2A2A3C]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Total Revenue"
            value={`€${analytics.summary.totalRevenue.toFixed(2)}`}
            color="blue"
          />
          <StatCard
            icon={<Lock className="w-6 h-6" />}
            title="Frozen Balance"
            value={`€${analytics.summary.frozenBalance.toFixed(2)}`}
            subtitle={`${analytics.escrowStats.held} in escrow`}
            color="yellow"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Current Balance"
            value={`€${analytics.summary.currentBalance.toFixed(2)}`}
            subtitle="Available to withdraw"
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Success Rate"
            value={`${analytics.summary.successRate.toFixed(1)}%`}
            subtitle={`${analytics.summary.paidInvoices} / ${analytics.summary.totalInvoices} paid`}
            color="purple"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <h3 className="text-xl font-semibold text-white mb-4">Revenue Over Time</h3>
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff'
                  }
                },
                scales: {
                  x: {
                    grid: { color: '#2A2A3C' },
                    ticks: { color: '#9CA3AF' }
                  },
                  y: {
                    grid: { color: '#2A2A3C' },
                    ticks: { color: '#9CA3AF' }
                  }
                }
              }}
            />
          </div>

          {/* Payment Methods */}
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <h3 className="text-xl font-semibold text-white mb-4">Payment Methods</h3>
            <Doughnut
              data={paymentMethodsData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#9CA3AF', padding: 15 }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Customers
            </h3>
            <div className="space-y-3">
              {analytics.topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No customer data yet</p>
              ) : (
                analytics.topCustomers.map((customer, idx) => (
                  <div
                    key={customer.email}
                    className="flex justify-between items-center p-3 bg-[#0A0A0F] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-semibold">
                        {idx + 1}
                      </div>
                      <span className="text-gray-300">{customer.email}</span>
                    </div>
                    <span className="text-white font-semibold">€{customer.revenue.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Escrow Stats */}
          <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Escrow Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Currently Held</span>
                <span className="text-yellow-400 font-semibold">{analytics.escrowStats.held}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Released</span>
                <span className="text-green-400 font-semibold">{analytics.escrowStats.released}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Disputed</span>
                <span className="text-red-400 font-semibold">{analytics.escrowStats.disputed}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#2A2A3C]">
                <span className="text-gray-400">Avg. Release Time</span>
                <span className="text-white font-semibold">
                  {analytics.escrowStats.averageReleaseTime.toFixed(1)} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total in Escrow</span>
                <span className="text-white font-semibold">€{analytics.escrowStats.totalHeld.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <MetricCard
            title="Average Transaction"
            value={`€${analytics.summary.averageTransactionValue.toFixed(2)}`}
            subtitle="Per paid invoice"
          />
          <MetricCard
            title="Withdrawn"
            value={`€${analytics.summary.totalWithdrawn.toFixed(2)}`}
            subtitle="Total withdrawn"
          />
          <MetricCard
            title="Pending"
            value={`€${analytics.summary.totalPending.toFixed(2)}`}
            subtitle={`${analytics.summary.unpaidInvoices} unpaid invoices`}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle, color }: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle?: string
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }

  return (
    <div className={`bg-[#1A1A24] rounded-xl p-6 border ${colors[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
    </div>
  )
}

function MetricCard({ title, value, subtitle }: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="bg-[#1A1A24] rounded-xl p-6 border border-[#2A2A3C]">
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-gray-500 text-xs">{subtitle}</p>
    </div>
  )
}
