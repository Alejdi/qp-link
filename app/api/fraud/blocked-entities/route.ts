import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List blocked entities (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('type')

    let query = supabaseAdmin
      .from('blocked_entities')
      .select('*')
      .order('created_at', { ascending: false })

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data: entities, error } = await query

    if (error) {
      console.error('Error fetching blocked entities:', error)
      return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
    }

    return NextResponse.json({ entities })
  } catch (error) {
    console.error('Failed to fetch blocked entities:', error)
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
  }
}

// POST - Block an entity (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { entityType, entityValue, reason, expiresAt, isPermanent } = body

    if (!entityType || !entityValue || !reason) {
      return NextResponse.json(
        { error: 'Entity type, value, and reason required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('blocked_entities')
      .insert([{
        entity_type: entityType,
        entity_value: entityValue,
        reason,
        blocked_by: session.user.id,
        expires_at: expiresAt,
        is_permanent: isPermanent || false,
        times_blocked: 1
      }])

    if (error) {
      console.error('Error blocking entity:', error)
      return NextResponse.json({ error: 'Failed to block entity' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Entity blocked successfully'
    })
  } catch (error) {
    console.error('Failed to block entity:', error)
    return NextResponse.json({ error: 'Failed to block entity' }, { status: 500 })
  }
}
