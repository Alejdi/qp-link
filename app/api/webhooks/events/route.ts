import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List available webhook event types
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: eventTypes, error } = await supabaseAdmin
      .from('webhook_event_types')
      .select('*')
      .order('category', { ascending: true })
      .order('event_type', { ascending: true })

    if (error) {
      console.error('Error fetching event types:', error)
      return NextResponse.json({ error: 'Failed to fetch event types' }, { status: 500 })
    }

    // Group by category
    const grouped = (eventTypes || []).reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = []
      }
      acc[event.category].push(event)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      eventTypes: grouped,
      all: eventTypes
    })
  } catch (error) {
    console.error('Failed to fetch event types:', error)
    return NextResponse.json({ error: 'Failed to fetch event types' }, { status: 500 })
  }
}
