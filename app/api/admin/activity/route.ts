import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('user_id') || ''
    const action = searchParams.get('action') || ''

    let query = supabaseAdmin
      .from('activity_logs')
      .select('*, user:users(name, email)', { count: 'exact' })

    // Filter by user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Filter by action type
    if (action) {
      query = query.eq('action', action)
    }

    // Sort by most recent
    query = query.order('created_at', { ascending: false })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: activities, error, count } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json({
      activities: activities || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in activity API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
