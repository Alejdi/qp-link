import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List user's webhooks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: webhooks, error } = await supabaseAdmin
      .from('user_webhooks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Failed to fetch webhooks:', error)
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
  }
}

// POST - Create new webhook
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { url, description, events } = body

    // Validation
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'URL and events are required' }, { status: 400 })
    }

    // Validate URL format
    try {
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Validate events
    const { data: validEvents } = await supabaseAdmin
      .from('webhook_event_types')
      .select('event_type')

    const validEventTypes = (validEvents || []).map(e => e.event_type)
    const invalidEvents = events.filter(e => !validEventTypes.includes(e))

    if (invalidEvents.length > 0) {
      return NextResponse.json({
        error: `Invalid event types: ${invalidEvents.join(', ')}`
      }, { status: 400 })
    }

    // Check webhook limit (max 10 per user)
    const { count } = await supabaseAdmin
      .from('user_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    if ((count || 0) >= 10) {
      return NextResponse.json({ error: 'Maximum 10 webhooks allowed per user' }, { status: 400 })
    }

    // Create webhook using database function
    const { data: webhookId, error } = await supabaseAdmin.rpc('create_user_webhook', {
      p_user_id: session.user.id,
      p_url: url,
      p_description: description || null,
      p_events: events
    })

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    // Fetch created webhook
    const { data: webhook } = await supabaseAdmin
      .from('user_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single()

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Failed to create webhook:', error)
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }
}
