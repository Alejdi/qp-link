import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { sendEscrowReleasedEmail, sendDisputeOpenedEmail } from '@/lib/email-service'

// Generate a secure confirmation token for buyer
function generateConfirmationToken(escrowId: string, buyerEmail: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is not set')
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${escrowId}:${buyerEmail}`)
    .digest('hex')
}

// Verify the confirmation token
function verifyConfirmationToken(
  token: string,
  escrowId: string,
  buyerEmail: string
): boolean {
  try {
    const expectedToken = generateConfirmationToken(escrowId, buyerEmail)

    // Ensure both buffers are same length before comparison
    if (token.length !== expectedToken.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}

// GET - Get escrow status for buyer (with token)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const escrowId = searchParams.get('id')
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!escrowId || !token || !email) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Verify token
    if (!verifyConfirmationToken(token, escrowId, email)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Get escrow
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select(`
        id, buyer_email, amount, currency, status,
        seller_confirmed, buyer_confirmed,
        tracking_number, tracking_carrier, shipped_at,
        auto_release_at, created_at,
        invoice:products(name, short_code)
      `)
      .eq('id', escrowId)
      .eq('buyer_email', email)
      .single()

    if (error || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    return NextResponse.json({
      escrow: {
        id: escrow.id,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        sellerConfirmed: escrow.seller_confirmed,
        buyerConfirmed: escrow.buyer_confirmed,
        trackingNumber: escrow.tracking_number,
        trackingCarrier: escrow.tracking_carrier,
        shippedAt: escrow.shipped_at,
        autoReleaseAt: escrow.auto_release_at,
        invoice: escrow.invoice,
        createdAt: escrow.created_at,
      },
    })
  } catch (error) {
    console.error('Failed to fetch escrow for buyer:', error)
    return NextResponse.json({ error: 'Failed to fetch escrow' }, { status: 500 })
  }
}

// POST - Buyer confirms receipt or opens dispute
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { escrowId, token, email, action, reason } = body

    if (!escrowId || !token || !email || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Verify token
    if (!verifyConfirmationToken(token, escrowId, email)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Get escrow
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .eq('buyer_email', email)
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
      case 'confirm_received': {
        // Buyer confirms they received the item
        await supabaseAdmin
          .from('escrows')
          .update({
            buyer_confirmed: true,
            buyer_confirmed_at: new Date().toISOString(),
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowId)

        // Log event
        await supabaseAdmin.from('escrow_events').insert({
          escrow_id: escrowId,
          event_type: 'buyer_confirmed',
          actor_type: 'buyer',
          details: { email },
        })

        // Log buyer confirmation activity
        await logActivity({
          userId: escrow.seller_id,
          action: 'escrow_buyer_confirmed',
          details: {
            escrow_id: escrowId,
            buyer_email: email,
            amount: escrow.amount,
          },
          page: '/api/escrow/confirm',
        })

        // If seller also confirmed, auto-release
        if (escrow.seller_confirmed) {
          await supabaseAdmin.rpc('release_escrow', {
            p_escrow_id: escrowId,
            p_actor_type: 'system',
            p_actor_id: null,
          })

          // Log release
          await logActivity({
            userId: escrow.seller_id,
            action: 'escrow_released',
            details: {
              escrow_id: escrowId,
              amount: escrow.net_amount,
              released_to_seller: true,
            },
            page: '/api/escrow/confirm',
          })

          // Get seller info for email
          const { data: seller } = await supabaseAdmin
            .from('users')
            .select('email, name')
            .eq('id', escrow.seller_id)
            .single()

          // Get invoice name
          const { data: invoice } = await supabaseAdmin
            .from('products')
            .select('name')
            .eq('id', escrow.invoice_id)
            .single()

          // Send email to seller about release
          if (seller && invoice) {
            await sendEscrowReleasedEmail({
              sellerEmail: seller.email,
              sellerName: seller.name || 'Seller',
              invoiceName: invoice.name,
              netAmount: escrow.net_amount,
              buyerEmail: email,
            })
          }

          return NextResponse.json({
            success: true,
            message: 'Receipt confirmed and funds released to seller',
            released: true,
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Receipt confirmed. Waiting for seller confirmation.',
          released: false,
        })
      }

      case 'open_dispute': {
        if (!reason) {
          return NextResponse.json(
            { error: 'Dispute reason is required' },
            { status: 400 }
          )
        }

        // Open a dispute
        await supabaseAdmin
          .from('escrows')
          .update({
            status: 'disputed',
            dispute_reason: reason,
            dispute_opened_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowId)

        // Log event
        await supabaseAdmin.from('escrow_events').insert({
          escrow_id: escrowId,
          event_type: 'disputed',
          actor_type: 'buyer',
          details: { email, reason },
        })

        // Log dispute activity
        await logActivity({
          userId: escrow.seller_id,
          action: 'escrow_disputed',
          details: {
            escrow_id: escrowId,
            buyer_email: email,
            reason,
            amount: escrow.amount,
          },
          page: '/api/escrow/confirm',
        })

        // Get seller info for email
        const { data: seller } = await supabaseAdmin
          .from('users')
          .select('email, name')
          .eq('id', escrow.seller_id)
          .single()

        // Get invoice name
        const { data: invoice } = await supabaseAdmin
          .from('products')
          .select('name')
          .eq('id', escrow.invoice_id)
          .single()

        // Send email to seller about dispute
        if (seller && invoice) {
          await sendDisputeOpenedEmail({
            sellerEmail: seller.email,
            sellerName: seller.name || 'Seller',
            invoiceName: invoice.name,
            amount: escrow.amount,
            buyerEmail: email,
            reason,
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Dispute opened. Our team will review your case.',
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to process buyer action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

// Export the token generator for use in webhooks
export { generateConfirmationToken }
