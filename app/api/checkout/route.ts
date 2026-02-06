import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// POST - Create Stripe checkout session for an invoice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId, useEscrow = true } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    // Get invoice details (try by id first, then by short_code)
    let invoice = null
    let error = null

    // Try by UUID first
    const { data: invoiceById, error: errorById } = await supabaseAdmin
      .from('products')
      .select('*, users:user_id (id, name, email)')
      .eq('id', invoiceId)
      .single()

    if (invoiceById) {
      invoice = invoiceById
    } else {
      // Try by short_code
      const { data: invoiceByShortCode, error: errorByShortCode } = await supabaseAdmin
        .from('products')
        .select('*, users:user_id (id, name, email)')
        .eq('short_code', invoiceId)
        .single()

      invoice = invoiceByShortCode
      error = errorByShortCode
    }

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if already paid
    if (invoice.payment_status === 'paid' || invoice.payment_status === 'escrow') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: invoice.name,
              description: invoice.description || `Invoice #${invoice.short_code}`,
            },
            unit_amount: Math.round(invoice.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/payment/cancel?invoice_id=${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        use_escrow: useEscrow ? 'true' : 'false',
      },
      customer_email: undefined, // Let customer enter their email
      billing_address_collection: 'auto',
    })

    // Update invoice with checkout session ID (for tracking)
    await supabaseAdmin
      .from('products')
      .update({
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Log checkout initiation
    await logActivity({
      userId: invoice.user_id,
      action: 'checkout_initiated',
      details: {
        invoice_id: invoiceId,
        invoice_short_code: invoice.short_code,
        amount: invoice.price,
        use_escrow: useEscrow,
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      page: '/api/checkout',
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
