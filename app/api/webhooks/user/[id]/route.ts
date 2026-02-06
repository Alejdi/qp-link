import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get webhook details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: webhook, error } = await supabaseAdmin
      .from('user_webhooks')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Failed to fetch webhook:', error)
    return NextResponse.json({ error: 'Failed to fetch webhook' }, { status: 500 })
  }
}

// PATCH - Update webhook
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

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('user_webhooks')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.url !== undefined) updateData.url = body.url
    if (body.description !== undefined) updateData.description = body.description
    if (body.events !== undefined) updateData.events = body.events
    if (body.isActive !== undefined) updateData.is_active = body.isActive
    if (body.verifySsl !== undefined) updateData.verify_ssl = body.verifySsl
    if (body.customHeaders !== undefined) updateData.custom_headers = body.customHeaders
    if (body.rateLimitPerMinute !== undefined) updateData.rate_limit_per_minute = body.rateLimitPerMinute

    // Update webhook
    const { error } = await supabaseAdmin
      .from('user_webhooks')
      .update(updateData)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating webhook:', error)
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
    }

    // Fetch updated webhook
    const { data: updated } = await supabaseAdmin
      .from('user_webhooks')
      .select('*')
      .eq('id', params.id)
      .single()

    return NextResponse.json({ webhook: updated })
  } catch (error) {
    console.error('Failed to update webhook:', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}

// DELETE - Delete webhook
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
    const { data: webhook } = await supabaseAdmin
      .from('user_webhooks')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!webhook || webhook.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Delete webhook (cascade will delete deliveries)
    const { error } = await supabaseAdmin
      .from('user_webhooks')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting webhook:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete webhook:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
