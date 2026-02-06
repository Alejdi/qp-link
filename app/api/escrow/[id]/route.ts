import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger'

// GET - Get single escrow details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select(`
        *,
        invoice:products(id, name, short_code, price, description)
      `)
      .eq('id', params.id)
      .eq('seller_id', session.user.id)
      .single()

    if (error || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    // Get events timeline
    const { data: events } = await supabaseAdmin
      .from('escrow_events')
      .select('*')
      .eq('escrow_id', params.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      escrow: {
        id: escrow.id,
        buyerEmail: escrow.buyer_email,
        amount: escrow.amount,
        platformFee: escrow.platform_fee,
        processorFee: escrow.payment_processor_fee,
        netAmount: escrow.net_amount,
        currency: escrow.currency,
        paymentSource: escrow.payment_source,
        status: escrow.status,
        sellerConfirmed: escrow.seller_confirmed,
        sellerConfirmedAt: escrow.seller_confirmed_at,
        buyerConfirmed: escrow.buyer_confirmed,
        buyerConfirmedAt: escrow.buyer_confirmed_at,
        trackingNumber: escrow.tracking_number,
        trackingCarrier: escrow.tracking_carrier,
        shippedAt: escrow.shipped_at,
        deliveredAt: escrow.delivered_at,
        autoReleaseAt: escrow.auto_release_at,
        autoReleaseDays: escrow.auto_release_days,
        disputeReason: escrow.dispute_reason,
        disputeOpenedAt: escrow.dispute_opened_at,
        invoice: escrow.invoice,
        createdAt: escrow.created_at,
        releasedAt: escrow.released_at,
        refundedAt: escrow.refunded_at,
      },
      events: events?.map((e) => ({
        id: e.id,
        type: e.event_type,
        actorType: e.actor_type,
        details: e.details,
        createdAt: e.created_at,
      })) || [],
    })
  } catch (error) {
    console.error('Failed to fetch escrow:', error)
    return NextResponse.json({ error: 'Failed to fetch escrow' }, { status: 500 })
  }
}

// PUT - Update escrow (confirm shipping, add tracking, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, trackingNumber, trackingCarrier, reason } = body

    // Get the escrow
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', params.id)
      .eq('seller_id', session.user.id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    if (escrow.status !== 'held') {
      return NextResponse.json(
        { error: 'Escrow is not in held status' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'confirm_shipped': {
        // Seller confirms they shipped the item
        const { error } = await supabaseAdmin
          .from('escrows')
          .update({
            seller_confirmed: true,
            seller_confirmed_at: new Date().toISOString(),
            tracking_number: trackingNumber || null,
            tracking_carrier: trackingCarrier || null,
            shipped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)

        if (error) {
          throw error
        }

        // Log event
        await supabaseAdmin.from('escrow_events').insert({
          escrow_id: params.id,
          event_type: 'shipped',
          actor_type: 'seller',
          actor_id: session.user.id,
          details: {
            tracking_number: trackingNumber,
            tracking_carrier: trackingCarrier,
          },
        })

        // Log shipment confirmation activity
        await logActivity({
          userId: session.user.id,
          action: 'escrow_seller_confirmed_shipment',
          details: {
            escrow_id: params.id,
            amount: escrow.amount,
            tracking_number: trackingNumber,
            tracking_carrier: trackingCarrier,
            buyer_email: escrow.buyer_email,
          },
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          page: '/api/escrow/[id]',
        })

        return NextResponse.json({ success: true, message: 'Shipment confirmed' })
      }

      case 'update_tracking': {
        // Update tracking info
        const { error } = await supabaseAdmin
          .from('escrows')
          .update({
            tracking_number: trackingNumber,
            tracking_carrier: trackingCarrier,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)

        if (error) {
          throw error
        }

        return NextResponse.json({ success: true, message: 'Tracking updated' })
      }

      case 'request_release': {
        // If both parties confirmed or auto-release conditions met
        if (escrow.buyer_confirmed && escrow.seller_confirmed) {
          // Release the escrow
          const { data: result } = await supabaseAdmin.rpc('release_escrow', {
            p_escrow_id: params.id,
            p_actor_type: 'seller',
            p_actor_id: session.user.id,
          })

          // Log release request activity
          await logActivity({
            userId: session.user.id,
            action: 'escrow_release_requested',
            details: {
              escrow_id: params.id,
              amount: escrow.net_amount,
              buyer_confirmed: escrow.buyer_confirmed,
              seller_confirmed: escrow.seller_confirmed,
            },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            page: '/api/escrow/[id]',
          })

          return NextResponse.json({
            success: true,
            message: 'Funds released to your wallet',
          })
        } else {
          return NextResponse.json(
            { error: 'Both parties must confirm before release' },
            { status: 400 }
          )
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to update escrow:', error)
    return NextResponse.json({ error: 'Failed to update escrow' }, { status: 500 })
  }
}
