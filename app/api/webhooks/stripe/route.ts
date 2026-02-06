import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { sendPaymentReceivedEmail, sendBuyerConfirmationEmail } from '@/lib/email-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Generate confirmation token for buyer (same as in escrow/confirm/route.ts)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Check if event already processed (idempotency)
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single()

    if (existingEvent) {
      console.log('Event already processed:', event.id)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Store event
    await supabaseAdmin.from('stripe_events').insert({
      id: event.id,
      type: event.type,
      data: event.data,
      processed: false,
    })

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge)
        break

      // Subscription events
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    // Mark event as processed
    await supabaseAdmin
      .from('stripe_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// Handle successful checkout session - NOW CREATES ESCROW
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)

  // Check if this is a payment link payment
  const paymentLinkId = session.metadata?.payment_link_id
  const paymentLinkPaymentId = session.metadata?.payment_link_payment_id

  if (paymentLinkId && paymentLinkPaymentId) {
    await handlePaymentLinkCheckout(session, paymentLinkId, paymentLinkPaymentId)
    return
  }

  const invoiceId = session.metadata?.invoice_id
  const userId = session.metadata?.user_id
  const useEscrow = session.metadata?.use_escrow !== 'false' // Default to escrow

  if (!invoiceId || !userId) {
    console.error('Missing invoice_id or user_id in session metadata')
    return
  }

  // Get the invoice/product
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('products')
    .select('*, users:user_id (id, name, email)')
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) {
    console.error('CRITICAL: Invoice not found for paid session:', invoiceId, invoiceError)
    // Mark event as processed but with error flag
    await supabaseAdmin
      .from('stripe_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_error: `Invoice ${invoiceId} not found`
      })
      .eq('id', event.id)

    // TODO: Send alert to admin about orphaned payment
    throw new Error(`Invoice ${invoiceId} not found - payment received but no invoice exists`)
  }

  // Validate seller user exists
  if (!invoice.users || !invoice.users.email) {
    console.error('CRITICAL: Seller user data missing for invoice:', invoiceId)
    await supabaseAdmin
      .from('stripe_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_error: 'Seller user data missing'
      })
      .eq('id', event.id)

    throw new Error(`Seller user data missing for invoice ${invoiceId}`)
  }

  // Get seller's wallet (or create one)
  let { data: wallet, error: walletFetchError } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', invoice.user_id)
    .single()

  if (!wallet) {
    console.log('Creating new wallet for user:', invoice.user_id)
    const { data: newWallet, error: walletCreateError } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: invoice.user_id })
      .select()
      .single()

    if (walletCreateError || !newWallet) {
      console.error('CRITICAL: Failed to create wallet for user:', invoice.user_id, walletCreateError)
      await supabaseAdmin
        .from('stripe_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: `Failed to create wallet: ${walletCreateError?.message}`
        })
        .eq('id', event.id)

      throw new Error(`Failed to create wallet for user ${invoice.user_id}`)
    }

    wallet = newWallet
  }

  if (!wallet) {
    console.error('CRITICAL: Wallet is null after creation attempt for user:', invoice.user_id)
    throw new Error(`Wallet is null for user ${invoice.user_id}`)
  }

  const amount = session.amount_total ? session.amount_total / 100 : invoice.price

  // Get fee rates from environment variables
  const STRIPE_FEE_PERCENTAGE = parseFloat(process.env.STRIPE_FEE_PERCENTAGE || '0.029')
  const STRIPE_FEE_FIXED = parseFloat(process.env.STRIPE_FEE_FIXED || '0.30')
  const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '0.02')

  const stripeFee = amount * STRIPE_FEE_PERCENTAGE + STRIPE_FEE_FIXED
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE
  const totalFee = Math.round((stripeFee + platformFee) * 100) / 100
  const netAmount = Math.round((amount - totalFee) * 100) / 100
  const buyerEmail = session.customer_details?.email || 'unknown@email.com'

  if (useEscrow) {
    // === ESCROW FLOW ===
    // Money goes to frozen_balance until both parties confirm

    // Create escrow record
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .insert({
        seller_id: invoice.user_id,
        buyer_email: buyerEmail,
        invoice_id: invoiceId,
        amount,
        platform_fee: platformFee,
        payment_processor_fee: stripeFee,
        net_amount: netAmount,
        currency: 'EUR',
        payment_source: 'stripe',
        payment_reference: session.payment_intent as string,
        status: 'held',
        auto_release_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        auto_release_days: 14,
      })
      .select()
      .single()

    if (escrowError || !escrow) {
      console.error('CRITICAL: Failed to create escrow:', escrowError)
      throw new Error(`Failed to create escrow for invoice ${invoiceId}`)
    }

    // Create transaction record (pending status)
    const { error: transactionError } = await supabaseAdmin.from('transactions').insert({
      wallet_id: wallet.id,
      user_id: invoice.user_id,
      type: 'payment_received',
      direction: 'in',
      amount,
      fee: totalFee,
      net_amount: netAmount,
      source: 'stripe',
      source_transaction_id: session.payment_intent as string,
      invoice_id: invoiceId,
      status: 'pending', // Will become 'completed' when escrow releases
      description: `Payment for ${invoice.name} (in escrow)`,
      metadata: {
        checkout_session_id: session.id,
        customer_email: buyerEmail,
        customer_name: session.customer_details?.name,
        stripe_fee: stripeFee,
        platform_fee: platformFee,
        escrow_id: escrow.id,
        in_escrow: true,
      },
    })

    if (transactionError) {
      console.error('CRITICAL: Failed to create transaction record:', transactionError)
      throw new Error(`Failed to create transaction for escrow ${escrow.id}`)
    }

    // Update wallet frozen balance (not available balance)
    const { error: walletUpdateError } = await supabaseAdmin
      .from('wallets')
      .update({
        frozen_balance: Number(wallet.frozen_balance || 0) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (walletUpdateError) {
      console.error('CRITICAL: Failed to update wallet frozen balance:', walletUpdateError)
      throw new Error(`Failed to update wallet ${wallet.id} frozen balance`)
    }

    // Log escrow event
    await supabaseAdmin.from('escrow_events').insert({
      escrow_id: escrow.id,
      event_type: 'payment_received',
      actor_type: 'system',
      details: {
        amount,
        net_amount: netAmount,
        source: 'stripe',
        payment_intent: session.payment_intent,
      },
    })

    // Mark invoice as paid (but in escrow)
    await supabaseAdmin
      .from('products')
      .update({
        payment_status: 'escrow',
        paid_at: new Date().toISOString(),
        paid_amount: amount,
        payer_email: buyerEmail,
      })
      .eq('id', invoiceId)

    // Generate buyer confirmation URL
    const token = generateConfirmationToken(escrow.id, buyerEmail)
    const confirmUrl = `${process.env.NEXTAUTH_URL}/escrow/confirm?id=${escrow.id}&email=${encodeURIComponent(buyerEmail)}&token=${token}`

    console.log(`Escrow created: €${amount} -> €${netAmount} (after fees) for user ${invoice.user_id}`)
    console.log(`Buyer confirmation URL: ${confirmUrl}`)

    // Log payment received
    await logActivity({
      userId: invoice.user_id,
      action: 'payment_received',
      details: {
        invoice_id: invoiceId,
        invoice_short_code: invoice.short_code,
        amount,
        net_amount: netAmount,
        buyer_email: buyerEmail,
        escrow_id: escrow.id,
        payment_source: 'stripe',
      },
      page: '/api/webhooks/stripe',
    })

    // Send email notifications
    await Promise.all([
      // Email seller about payment (in escrow)
      sendPaymentReceivedEmail({
        sellerEmail: invoice.users.email,
        sellerName: invoice.users.name || 'Seller',
        invoiceName: invoice.name,
        invoiceShortId: invoice.short_code,
        amount,
        netAmount,
        buyerEmail,
        isEscrow: true,
      }),
      // Email buyer with confirmation link
      sendBuyerConfirmationEmail({
        buyerEmail,
        invoiceName: invoice.name,
        amount,
        confirmUrl,
        sellerName: invoice.users.name,
      }),
    ])

  } else {
    // === DIRECT FLOW (no escrow) ===
    // For digital goods or when escrow is disabled

    // Create transaction
    await supabaseAdmin.from('transactions').insert({
      wallet_id: wallet.id,
      user_id: invoice.user_id,
      type: 'payment_received',
      direction: 'in',
      amount,
      fee: totalFee,
      net_amount: netAmount,
      source: 'stripe',
      source_transaction_id: session.payment_intent as string,
      invoice_id: invoiceId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      description: `Payment for ${invoice.name}`,
      metadata: {
        checkout_session_id: session.id,
        customer_email: buyerEmail,
        customer_name: session.customer_details?.name,
        stripe_fee: stripeFee,
        platform_fee: platformFee,
      },
    })

    // Update wallet balance directly
    await supabaseAdmin
      .from('wallets')
      .update({
        balance: Number(wallet.balance) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    // Mark invoice as paid
    await supabaseAdmin
      .from('products')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        paid_amount: amount,
        payer_email: buyerEmail,
      })
      .eq('id', invoiceId)

    console.log(`Direct payment: €${amount} -> €${netAmount} (after fees) for user ${invoice.user_id}`)

    // Log direct payment
    await logActivity({
      userId: invoice.user_id,
      action: 'payment_received_direct',
      details: {
        invoice_id: invoiceId,
        invoice_short_code: invoice.short_code,
        amount,
        net_amount: netAmount,
        buyer_email: buyerEmail,
        payment_source: 'stripe',
      },
      page: '/api/webhooks/stripe',
    })

    // Email seller about direct payment
    await sendPaymentReceivedEmail({
      sellerEmail: invoice.users.email,
      sellerName: invoice.users.name || 'Seller',
      invoiceName: invoice.name,
      invoiceShortId: invoice.short_code,
      amount,
      netAmount,
      buyerEmail,
      isEscrow: false,
    })
  }
}

// Handle direct payment intent success (for other payment flows)
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id)

  // Check if already handled via checkout.session.completed
  const { data: existingTx } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('source_transaction_id', paymentIntent.id)
    .single()

  if (existingTx) {
    console.log('Payment already processed via checkout session')
    return
  }

  // Handle direct payment intents if needed
  const invoiceId = paymentIntent.metadata?.invoice_id
  const userId = paymentIntent.metadata?.user_id

  if (!invoiceId || !userId) {
    console.log('No invoice metadata, skipping')
    return
  }

  // Similar processing as checkout complete...
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id)

  const invoiceId = paymentIntent.metadata?.invoice_id
  if (!invoiceId) return

  // Update invoice status
  await supabaseAdmin
    .from('products')
    .update({
      payment_status: 'failed',
      payment_error: paymentIntent.last_payment_error?.message,
    })
    .eq('id', invoiceId)
}

// Handle refund
async function handleRefund(charge: Stripe.Charge) {
  console.log('Refund processed:', charge.id)

  // Find original transaction
  const { data: originalTx } = await supabaseAdmin
    .from('transactions')
    .select('*, wallets:wallet_id (*)')
    .eq('source_transaction_id', charge.payment_intent)
    .eq('type', 'payment_received')
    .single()

  if (!originalTx) {
    console.error('Original transaction not found for refund')
    return
  }

  const refundAmount = charge.amount_refunded / 100

  // Create refund transaction
  await supabaseAdmin.from('transactions').insert({
    wallet_id: originalTx.wallet_id,
    user_id: originalTx.user_id,
    type: 'refund',
    direction: 'out',
    amount: refundAmount,
    fee: 0,
    net_amount: refundAmount,
    source: 'stripe',
    source_transaction_id: charge.id,
    invoice_id: originalTx.invoice_id,
    status: 'completed',
    completed_at: new Date().toISOString(),
    description: 'Refund processed',
    metadata: { original_transaction_id: originalTx.id },
  })

  // Deduct from wallet
  await supabaseAdmin
    .from('wallets')
    .update({
      balance: Number(originalTx.wallets.balance) - refundAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', originalTx.wallet_id)

  // Update original transaction
  await supabaseAdmin
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('id', originalTx.id)
}

// Handle payment link checkout completion
async function handlePaymentLinkCheckout(
  session: Stripe.Checkout.Session,
  paymentLinkId: string,
  paymentLinkPaymentId: string
) {
  console.log('Processing payment link payment:', paymentLinkPaymentId)

  // Get payment link
  const { data: paymentLink, error: linkError } = await supabaseAdmin
    .from('payment_links')
    .select('*, user:user_id (id, name, email)')
    .eq('id', paymentLinkId)
    .single()

  if (linkError || !paymentLink) {
    console.error('Payment link not found:', paymentLinkId, linkError)
    throw new Error(`Payment link ${paymentLinkId} not found`)
  }

  // Get payment record
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payment_link_payments')
    .select('*')
    .eq('id', paymentLinkPaymentId)
    .single()

  if (paymentError || !payment) {
    console.error('Payment record not found:', paymentLinkPaymentId, paymentError)
    throw new Error(`Payment record ${paymentLinkPaymentId} not found`)
  }

  const amount = payment.amount
  const STRIPE_FEE_PERCENTAGE = parseFloat(process.env.STRIPE_FEE_PERCENTAGE || '0.029')
  const STRIPE_FEE_FIXED = parseFloat(process.env.STRIPE_FEE_FIXED || '0.30')
  const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '0.02')

  const stripeFee = amount * STRIPE_FEE_PERCENTAGE + STRIPE_FEE_FIXED
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE
  const totalFee = Math.round((stripeFee + platformFee) * 100) / 100
  const netAmount = Math.round((amount - totalFee) * 100) / 100

  // Get or create seller's wallet
  let { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', paymentLink.user_id)
    .single()

  if (!wallet) {
    const { data: newWallet } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: paymentLink.user_id })
      .select()
      .single()
    wallet = newWallet
  }

  if (!wallet) {
    throw new Error(`Failed to get/create wallet for user ${paymentLink.user_id}`)
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_link_payments')
    .update({
      status: 'completed',
      payment_intent_id: session.payment_intent as string,
      completed_at: new Date().toISOString()
    })
    .eq('id', paymentLinkPaymentId)

  // Create transaction record
  await supabaseAdmin.from('transactions').insert({
    wallet_id: wallet.id,
    user_id: paymentLink.user_id,
    type: 'payment_link',
    direction: 'in',
    amount,
    fee: totalFee,
    net_amount: netAmount,
    source: 'stripe',
    source_transaction_id: session.payment_intent as string,
    status: 'completed',
    completed_at: new Date().toISOString(),
    description: `Payment via link: ${paymentLink.title}`,
    metadata: {
      payment_link_id: paymentLinkId,
      payment_link_payment_id: paymentLinkPaymentId,
      checkout_session_id: session.id,
      customer_email: payment.payer_email,
      customer_name: payment.payer_name,
      customer_message: payment.payer_message,
      link_short_code: paymentLink.short_code
    }
  })

  // Update wallet balance
  await supabaseAdmin
    .from('wallets')
    .update({
      balance: Number(wallet.balance || 0) + netAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', wallet.id)

  // Increment uses count and update last_used_at
  await supabaseAdmin
    .from('payment_links')
    .update({
      uses_count: paymentLink.uses_count + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', paymentLinkId)

  // Log activity
  await logActivity({
    userId: paymentLink.user_id,
    action: 'payment_link_paid',
    details: {
      payment_link_id: paymentLinkId,
      payment_link_short_code: paymentLink.short_code,
      payment_link_title: paymentLink.title,
      amount,
      net_amount: netAmount,
      payer_email: payment.payer_email,
      payer_name: payment.payer_name,
      payment_source: 'stripe'
    },
    page: '/api/webhooks/stripe'
  })

  console.log(`Payment link payment processed: €${amount} -> €${netAmount} for user ${paymentLink.user_id}`)

  // TODO: Send email notification to seller about payment link payment
}

// Handle subscription update
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!existingSub) {
    console.log('Subscription not found in database:', subscription.id)
    return
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}

// Handle invoice paid (for subscriptions)
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Invoice paid:', invoice.id)

  if (!invoice.subscription) {
    return // Not a subscription invoice
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single()

  if (!subscription) {
    console.log('Subscription not found for invoice:', invoice.id)
    return
  }

  const amount = invoice.amount_paid / 100
  const STRIPE_FEE_PERCENTAGE = parseFloat(process.env.STRIPE_FEE_PERCENTAGE || '0.029')
  const STRIPE_FEE_FIXED = parseFloat(process.env.STRIPE_FEE_FIXED || '0.30')
  const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '0.02')

  const stripeFee = amount * STRIPE_FEE_PERCENTAGE + STRIPE_FEE_FIXED
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE
  const totalFee = Math.round((stripeFee + platformFee) * 100) / 100
  const netAmount = Math.round((amount - totalFee) * 100) / 100

  // Create subscription invoice record
  await supabaseAdmin
    .from('subscription_invoices')
    .insert({
      subscription_id: subscription.id,
      invoice_number: `SUB-${invoice.number}`,
      amount,
      currency: invoice.currency.toUpperCase(),
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string || null,
      status: 'paid',
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      paid_at: new Date().toISOString()
    })

  // Get or create seller's wallet
  let { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', subscription.user_id)
    .single()

  if (!wallet) {
    const { data: newWallet } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: subscription.user_id })
      .select()
      .single()
    wallet = newWallet
  }

  if (!wallet) {
    throw new Error(`Failed to get/create wallet for user ${subscription.user_id}`)
  }

  // Create transaction
  await supabaseAdmin.from('transactions').insert({
    wallet_id: wallet.id,
    user_id: subscription.user_id,
    type: 'subscription_payment',
    direction: 'in',
    amount,
    fee: totalFee,
    net_amount: netAmount,
    source: 'stripe',
    source_transaction_id: invoice.payment_intent as string || invoice.id,
    status: 'completed',
    completed_at: new Date().toISOString(),
    description: `Subscription payment: ${subscription.name}`,
    metadata: {
      subscription_id: subscription.id,
      invoice_id: invoice.id,
      customer_email: subscription.customer_email
    }
  })

  // Update wallet balance
  await supabaseAdmin
    .from('wallets')
    .update({
      balance: Number(wallet.balance || 0) + netAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', wallet.id)

  // Update subscription last billing
  await supabaseAdmin
    .from('subscriptions')
    .update({
      last_billing_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription.id)

  console.log(`Subscription invoice paid: €${amount} -> €${netAmount} for user ${subscription.user_id}`)
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)

  if (!invoice.subscription) {
    return
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single()

  if (!subscription) {
    return
  }

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription.id)

  // Create failed invoice record
  await supabaseAdmin
    .from('subscription_invoices')
    .insert({
      subscription_id: subscription.id,
      invoice_number: `SUB-${invoice.number}`,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      stripe_invoice_id: invoice.id,
      status: 'uncollectible',
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString()
    })

  console.log(`Subscription payment failed for subscription ${subscription.id}`)

  // TODO: Send email notification to seller about failed payment
}
