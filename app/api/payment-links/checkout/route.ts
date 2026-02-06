import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

// POST - Create Stripe checkout session for payment link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { payment_link_id, amount, email, name, message } = body

    // Validation
    if (!payment_link_id) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // Fetch payment link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('payment_links')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email
        )
      `)
      .eq('id', payment_link_id)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Validation checks
    if (!link.is_active) {
      return NextResponse.json({ error: 'Payment link is inactive' }, { status: 403 })
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Payment link has expired' }, { status: 410 })
    }

    if (link.max_uses && link.uses_count >= link.max_uses) {
      return NextResponse.json({ error: 'Payment link has reached maximum uses' }, { status: 410 })
    }

    // Validate amount against link settings
    if (link.allow_custom_amount) {
      if (amount < link.min_amount) {
        return NextResponse.json({
          error: `Amount must be at least €${link.min_amount.toFixed(2)}`
        }, { status: 400 })
      }
      if (link.max_amount && amount > link.max_amount) {
        return NextResponse.json({
          error: `Amount must not exceed €${link.max_amount.toFixed(2)}`
        }, { status: 400 })
      }
    } else {
      // Fixed amount - must match exactly
      if (Math.abs(amount - link.amount) > 0.01) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
    }

    if (link.require_email && !email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (link.require_name && !name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_link_payments')
      .insert({
        payment_link_id: link.id,
        amount: amount,
        currency: link.currency,
        status: 'pending',
        payer_email: email || null,
        payer_name: name || null,
        payer_message: message || null
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: link.currency.toLowerCase(),
            product_data: {
              name: link.title,
              description: link.description || undefined
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: link.redirect_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment-link/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay-link/${link.short_code}`,
      customer_email: email || undefined,
      metadata: {
        payment_link_id: link.id,
        payment_link_payment_id: payment.id,
        seller_id: link.user_id,
        payer_name: name || '',
        payer_message: message || ''
      }
    })

    // Update payment with checkout session ID
    await supabaseAdmin
      .from('payment_link_payments')
      .update({ checkout_session_id: session.id })
      .eq('id', payment.id)

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
