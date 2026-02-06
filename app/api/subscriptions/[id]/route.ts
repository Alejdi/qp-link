import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

// GET - Get subscription details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get invoices for this subscription
    const { data: invoices } = await supabaseAdmin
      .from('subscription_invoices')
      .select('*')
      .eq('subscription_id', params.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      subscription,
      invoices: invoices || []
    })
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

// PATCH - Update subscription
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    // Verify ownership
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
    }

    switch (action) {
      case 'pause':
        // Pause subscription
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          pause_collection: {
            behavior: 'mark_uncollectible'
          }
        })

        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', params.id)

        break

      case 'resume':
        // Resume subscription
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          pause_collection: null
        })

        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', params.id)

        break

      case 'cancel':
        // Cancel at period end
        const cancelImmediate = body.immediate || false

        if (cancelImmediate) {
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id)

          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', params.id)
        } else {
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true
          })

          await supabaseAdmin
            .from('subscriptions')
            .update({
              cancel_at: subscription.current_period_end,
              auto_renew: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', params.id)
        }

        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch updated subscription
    const { data: updated } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', params.id)
      .single()

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}

// DELETE - Delete subscription
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Cancel Stripe subscription if exists
    if (subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
      } catch (error) {
        console.error('Error canceling Stripe subscription:', error)
      }
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting subscription:', error)
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete subscription:', error)
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}
