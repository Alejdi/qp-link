import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

// GET - List user's subscriptions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    return NextResponse.json({ subscriptions: subscriptions || [] })
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

// POST - Create new subscription
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      description,
      amount,
      currency,
      interval,
      intervalCount,
      customerEmail,
      customerName,
      trialDays
    } = body

    // Validation
    if (!name || !amount || !interval || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    const validIntervals = ['day', 'week', 'month', 'year']
    if (!validIntervals.includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    // Create or get Stripe customer
    let stripeCustomer: Stripe.Customer
    const { data: existingCustomer } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('customer_email', customerEmail)
      .limit(1)
      .single()

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id) as Stripe.Customer
    } else {
      stripeCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || undefined,
        metadata: {
          seller_id: session.user.id
        }
      })
    }

    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: name,
      description: description || undefined,
      metadata: {
        seller_id: session.user.id
      }
    })

    // Create Stripe price
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      recurring: {
        interval: interval as 'day' | 'week' | 'month' | 'year',
        interval_count: intervalCount || 1
      }
    })

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: stripePrice.id }],
      trial_period_days: trialDays || undefined,
      metadata: {
        seller_id: session.user.id,
        subscription_name: name
      }
    })

    // Calculate next billing date
    const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000)

    // Create subscription in database
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: session.user.id,
        customer_email: customerEmail,
        customer_name: customerName || null,
        name,
        description: description || null,
        amount,
        currency: currency || 'EUR',
        interval,
        interval_count: intervalCount || 1,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomer.id,
        stripe_price_id: stripePrice.id,
        stripe_product_id: stripeProduct.id,
        status: stripeSubscription.status,
        trial_end_at: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        next_billing_date: nextBillingDate.toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription:', error)
      // Cleanup Stripe resources
      await stripe.subscriptions.cancel(stripeSubscription.id)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('Failed to create subscription:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
