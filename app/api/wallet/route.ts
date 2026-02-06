import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get wallet balance and info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create wallet
    let { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error || !wallet) {
      // Create wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: session.user.id })
        .select()
        .single()

      if (createError) {
        console.error('Error creating wallet:', createError)
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
      }

      wallet = newWallet
    }

    // Get recent transactions
    const { data: recentTransactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get transaction stats
    const { data: stats } = await supabaseAdmin
      .from('transactions')
      .select('direction, net_amount')
      .eq('wallet_id', wallet.id)
      .eq('status', 'completed')

    const totalIn = stats?.filter(t => t.direction === 'in').reduce((sum, t) => sum + Number(t.net_amount), 0) || 0
    const totalOut = stats?.filter(t => t.direction === 'out').reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    // Get escrow summary
    const { data: escrows } = await supabaseAdmin
      .from('escrows')
      .select('status, net_amount')
      .eq('seller_id', session.user.id)

    const escrowHeld = escrows?.filter(e => e.status === 'held').reduce((sum, e) => sum + Number(e.net_amount), 0) || 0
    const escrowCount = escrows?.filter(e => e.status === 'held').length || 0

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        pendingBalance: Number(wallet.pending_balance),
        frozenBalance: Number(wallet.frozen_balance || 0),
        currency: wallet.currency,
        isActive: wallet.is_active,
      },
      escrow: {
        heldAmount: escrowHeld,
        heldCount: escrowCount,
      },
      stats: {
        totalIn,
        totalOut,
        transactionCount: stats?.length || 0,
      },
      recentTransactions: recentTransactions?.map(t => ({
        id: t.id,
        type: t.type,
        direction: t.direction,
        amount: Number(t.amount),
        fee: Number(t.fee),
        netAmount: Number(t.net_amount),
        source: t.source,
        status: t.status,
        description: t.description,
        createdAt: t.created_at,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to fetch wallet:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}
