import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get monthly transaction analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const months = parseInt(searchParams.get('months') || '12')
    const currency = searchParams.get('currency') || 'EUR'

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    // Fetch transactions for the period
    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, created_at, currency')
      .eq('user_id', session.user.id)
      .eq('currency', currency)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Group transactions by month
    const monthlyData: Record<string, { in: number; out: number; net: number; count: number }> = {}

    // Initialize all months in the range
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[key] = { in: 0, out: 0, net: 0, count: 0 }
    }

    // Process transactions
    transactions?.forEach((tx) => {
      const date = new Date(tx.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (monthlyData[key]) {
        const amount = parseFloat(tx.amount.toString())

        // Determine if it's income or expense based on transaction type
        const incomeTypes = [
          'payment_received',
          'escrow_release',
          'refund',
          'subscription_payment',
          'invoice_payment',
          'payment_link_payment',
          'credit',
          'deposit'
        ]

        const expenseTypes = [
          'withdrawal',
          'payout',
          'escrow_hold',
          'fee',
          'debit',
          'payment_sent'
        ]

        const isIncome = incomeTypes.some(type => tx.type.toLowerCase().includes(type.toLowerCase()))
        const isExpense = expenseTypes.some(type => tx.type.toLowerCase().includes(type.toLowerCase()))

        if (isIncome) {
          monthlyData[key].in += amount
        } else if (isExpense) {
          monthlyData[key].out += amount
        } else {
          // Default: positive amount = income, negative = expense
          if (amount >= 0) {
            monthlyData[key].in += amount
          } else {
            monthlyData[key].out += Math.abs(amount)
          }
        }

        monthlyData[key].net = monthlyData[key].in - monthlyData[key].out
        monthlyData[key].count += 1
      }
    })

    // Convert to array format with month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const result = Object.entries(monthlyData).map(([key, data]) => {
      const [year, month] = key.split('-')
      const monthIndex = parseInt(month) - 1

      return {
        month: monthNames[monthIndex],
        monthShort: monthNames[monthIndex].substring(0, 3),
        year: parseInt(year),
        key,
        ...data
      }
    })

    // Calculate totals
    const totals = result.reduce(
      (acc, month) => ({
        in: acc.in + month.in,
        out: acc.out + month.out,
        net: acc.net + month.net,
        count: acc.count + month.count
      }),
      { in: 0, out: 0, net: 0, count: 0 }
    )

    return NextResponse.json({
      monthly: result,
      totals,
      currency,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        months
      }
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
