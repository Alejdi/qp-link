import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Request a withdrawal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { amount, method, destinationDetails } = body

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
      return NextResponse.json({ error: 'Invalid amount (must be between 0 and 1,000,000)' }, { status: 400 })
    }

    if (amount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is €10' }, { status: 400 })
    }

    // Validate method
    const validMethods = ['bank_transfer', 'paypal', 'crypto']
    if (!method || typeof method !== 'string' || !validMethods.includes(method)) {
      return NextResponse.json({ error: 'Invalid withdrawal method' }, { status: 400 })
    }

    // Validate destination details
    if (!destinationDetails || typeof destinationDetails !== 'object') {
      return NextResponse.json({ error: 'Destination details required' }, { status: 400 })
    }

    // Validate destination details structure based on method
    if (method === 'bank_transfer' && (!destinationDetails.iban || !destinationDetails.accountHolder)) {
      return NextResponse.json({ error: 'IBAN and account holder name required for bank transfer' }, { status: 400 })
    }

    if (method === 'paypal' && !destinationDetails.email) {
      return NextResponse.json({ error: 'PayPal email required' }, { status: 400 })
    }

    if (method === 'crypto' && (!destinationDetails.address || !destinationDetails.network)) {
      return NextResponse.json({ error: 'Crypto address and network required' }, { status: 400 })
    }

    // Get wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Check balance
    if (Number(wallet.balance) < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Calculate fee (example: 2% for bank, 3% for PayPal, 1% for crypto)
    const feeRates: Record<string, number> = {
      bank_transfer: 0.02,
      paypal: 0.03,
      crypto: 0.01,
    }
    const fee = Math.round(amount * (feeRates[method] || 0.02) * 100) / 100
    const netAmount = amount - fee

    // Create transaction (pending)
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: session.user.id,
        type: 'withdrawal',
        direction: 'out',
        amount,
        fee,
        net_amount: netAmount,
        source: method,
        status: 'pending',
        description: `Withdrawal to ${method.replace('_', ' ')}`,
        metadata: { destination: destinationDetails },
      })
      .select()
      .single()

    if (txError) {
      console.error('Error creating transaction:', txError)
      return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
    }

    // Create withdrawal record
    const { data: withdrawal, error: wdError } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        wallet_id: wallet.id,
        user_id: session.user.id,
        transaction_id: transaction.id,
        amount,
        fee,
        net_amount: netAmount,
        method,
        destination_details: destinationDetails,
        status: 'pending',
      })
      .select()
      .single()

    if (wdError) {
      console.error('Error creating withdrawal:', wdError)
      return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
    }

    // Deduct from balance (hold the money)
    await supabaseAdmin
      .from('wallets')
      .update({
        balance: Number(wallet.balance) - amount,
        pending_balance: Number(wallet.pending_balance) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amount,
        fee,
        netAmount,
        method,
        status: withdrawal.status,
        createdAt: withdrawal.created_at,
      },
      message: 'Withdrawal request submitted. It will be processed within 1-3 business days.',
    })
  } catch (error) {
    console.error('Failed to create withdrawal:', error)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}

// GET - Get withdrawal history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: withdrawals, error, count } = await supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching withdrawals:', error)
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
    }

    return NextResponse.json({
      withdrawals: withdrawals?.map(w => ({
        id: w.id,
        amount: Number(w.amount),
        fee: Number(w.fee),
        netAmount: Number(w.net_amount),
        method: w.method,
        status: w.status,
        createdAt: w.created_at,
        processedAt: w.processed_at,
        failureReason: w.failure_reason,
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch withdrawals:', error)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}
