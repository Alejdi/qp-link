import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30' // days
    const periodDays = Math.min(365, Math.max(1, parseInt(period)))

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get user's wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, frozen_balance, pending_balance')
      .eq('user_id', session.user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Get all transactions for the period
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Get all invoices for the period
    const { data: invoices } = await supabaseAdmin
      .from('products')
      .select('id, name, price, payment_status, paid_at, payer_email, created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', startDate.toISOString())

    // Get escrows
    const { data: escrows } = await supabaseAdmin
      .from('escrows')
      .select('status, amount, net_amount, created_at, released_at')
      .eq('seller_id', session.user.id)
      .gte('created_at', startDate.toISOString())

    // Calculate metrics
    const totalRevenue = transactions
      ?.filter(t => t.direction === 'in' && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    const totalPending = transactions
      ?.filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const totalWithdrawn = transactions
      ?.filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const paidInvoices = invoices?.filter(inv =>
      inv.payment_status === 'paid' || inv.payment_status === 'escrow'
    ).length || 0

    const unpaidInvoices = invoices?.filter(inv =>
      inv.payment_status === 'unpaid' || !inv.payment_status
    ).length || 0

    const averageTransactionValue = paidInvoices > 0
      ? totalRevenue / paidInvoices
      : 0

    // Calculate success rate
    const totalPaymentAttempts = paidInvoices + (invoices?.filter(inv =>
      inv.payment_status === 'failed'
    ).length || 0)
    const successRate = totalPaymentAttempts > 0
      ? (paidInvoices / totalPaymentAttempts) * 100
      : 0

    // Group transactions by day for chart
    const dailyRevenue = transactions?.reduce((acc, t) => {
      if (t.direction === 'in' && t.status === 'completed') {
        const date = new Date(t.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + Number(t.net_amount)
      }
      return acc
    }, {} as Record<string, number>) || {}

    // Fill in missing days with 0
    const revenueChart = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      revenueChart.push({
        date: dateStr,
        revenue: dailyRevenue[dateStr] || 0
      })
    }

    // Top customers by volume
    const customerRevenue = transactions
      ?.filter(t => t.direction === 'in' && t.status === 'completed' && t.metadata?.customer_email)
      .reduce((acc, t) => {
        const email = t.metadata.customer_email
        acc[email] = (acc[email] || 0) + Number(t.net_amount)
        return acc
      }, {} as Record<string, number>) || {}

    const topCustomers = Object.entries(customerRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([email, revenue]) => ({ email, revenue }))

    // Escrow statistics
    const escrowStats = {
      held: escrows?.filter(e => e.status === 'held').length || 0,
      released: escrows?.filter(e => e.status === 'released').length || 0,
      disputed: escrows?.filter(e => e.status === 'disputed').length || 0,
      totalHeld: escrows
        ?.filter(e => e.status === 'held')
        .reduce((sum, e) => sum + Number(e.net_amount), 0) || 0,
      averageReleaseTime: calculateAverageReleaseTime(escrows || [])
    }

    // Payment method breakdown
    const paymentMethods = transactions
      ?.filter(t => t.direction === 'in' && t.status === 'completed')
      .reduce((acc, t) => {
        const source = t.source || 'unknown'
        acc[source] = (acc[source] || 0) + Number(t.net_amount)
        return acc
      }, {} as Record<string, number>) || {}

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalPending,
        totalWithdrawn,
        currentBalance: Number(wallet.balance),
        frozenBalance: Number(wallet.frozen_balance),
        pendingBalance: Number(wallet.pending_balance),
        paidInvoices,
        unpaidInvoices,
        averageTransactionValue,
        successRate,
        totalInvoices: (invoices?.length || 0)
      },
      charts: {
        revenueOverTime: revenueChart,
        paymentMethods: Object.entries(paymentMethods).map(([method, amount]) => ({
          method,
          amount
        }))
      },
      topCustomers,
      escrowStats,
      recentTransactions: transactions?.slice(0, 10) || []
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

function calculateAverageReleaseTime(escrows: any[]): number {
  const released = escrows.filter(e => e.status === 'released' && e.released_at)
  if (released.length === 0) return 0

  const totalDays = released.reduce((sum, e) => {
    const created = new Date(e.created_at)
    const releasedDate = new Date(e.released_at)
    const days = (releasedDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    return sum + days
  }, 0)

  return totalDays / released.length
}
