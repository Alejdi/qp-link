import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get all transactions with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const type = searchParams.get('type') || '' // payment_received, withdrawal, etc.
    const direction = searchParams.get('direction') || '' // in, out
    const source = searchParams.get('source') || '' // stripe, paypal, etc.
    const status = searchParams.get('status') || '' // pending, completed, failed

    // Validate pagination
    if (isNaN(page) || isNaN(limit)) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    // Get wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Build query
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        *,
        products:invoice_id (name, short_code)
      `, { count: 'exact' })
      .eq('wallet_id', wallet.id)

    if (type) query = query.eq('type', type)
    if (direction) query = query.eq('direction', direction)
    if (source) query = query.eq('source', source)
    if (status) query = query.eq('status', status)

    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json({
      transactions: transactions?.map(t => ({
        id: t.id,
        type: t.type,
        direction: t.direction,
        amount: Number(t.amount),
        fee: Number(t.fee),
        netAmount: Number(t.net_amount),
        currency: t.currency,
        source: t.source,
        sourceTransactionId: t.source_transaction_id,
        invoice: t.products ? {
          name: t.products.name,
          shortCode: t.products.short_code,
        } : null,
        status: t.status,
        description: t.description,
        metadata: t.metadata,
        createdAt: t.created_at,
        completedAt: t.completed_at,
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
