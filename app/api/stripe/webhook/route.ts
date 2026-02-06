import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get product ID from metadata
        const productId = session.metadata?.productId

        if (!productId) {
          console.error('No productId in session metadata')
          break
        }

        // Create payment record
        await prisma.payment.create({
          data: {
            productId,
            stripePaymentId: session.id,
            amount: (session.amount_total || 0) / 100, // Convert from cents
            status: 'completed',
          },
        })

        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Update payment status if it exists
        const existingPayment = await prisma.payment.findFirst({
          where: {
            stripePaymentId: paymentIntent.id,
          },
        })

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: 'completed' },
          })
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Update payment status if it exists
        const existingPayment = await prisma.payment.findFirst({
          where: {
            stripePaymentId: paymentIntent.id,
          },
        })

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: 'failed' },
          })
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
