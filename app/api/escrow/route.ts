import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List escrows for the current user (as seller)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('escrows')
      .select(`
        *,
        invoice:products(id, name, short_code, price)
      `, { count: 'exact' })
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: escrows, error, count } = await query

    if (error) {
      console.error('Error fetching escrows:', error)
      return NextResponse.json({ error: 'Failed to fetch escrows' }, { status: 500 })
    }

    // Get summary stats
    const { data: stats } = await supabaseAdmin
      .from('escrows')
      .select('status, net_amount')
      .eq('seller_id', session.user.id)

    const summary = {
      held: 0,
      released: 0,
      refunded: 0,
      disputed: 0,
      totalHeld: 0,
      totalReleased: 0,
    }

    stats?.forEach((e) => {
      if (e.status === 'held') {
        summary.held++
        summary.totalHeld += Number(e.net_amount)
      } else if (e.status === 'released') {
        summary.released++
        summary.totalReleased += Number(e.net_amount)
      } else if (e.status === 'refunded') {
        summary.refunded++
      } else if (e.status === 'disputed') {
        summary.disputed++
      }
    })

    return NextResponse.json({
      escrows: escrows?.map((e) => ({
        id: e.id,
        buyerEmail: e.buyer_email,
        amount: e.amount,
        platformFee: e.platform_fee,
        processorFee: e.payment_processor_fee,
        netAmount: e.net_amount,
        currency: e.currency,
        paymentSource: e.payment_source,
        status: e.status,
        sellerConfirmed: e.seller_confirmed,
        buyerConfirmed: e.buyer_confirmed,
        trackingNumber: e.tracking_number,
        trackingCarrier: e.tracking_carrier,
        shippedAt: e.shipped_at,
        autoReleaseAt: e.auto_release_at,
        invoice: e.invoice,
        createdAt: e.created_at,
        releasedAt: e.released_at,
      })) || [],
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch escrows:', error)
    return NextResponse.json({ error: 'Failed to fetch escrows' }, { status: 500 })
  }
}
