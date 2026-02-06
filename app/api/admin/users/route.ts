import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Role filter
    if (role) {
      query = query.eq('role', role)
    }

    // Status filter
    if (status === 'banned') {
      query = query.eq('is_banned', true)
    } else if (status === 'active') {
      query = query.eq('is_banned', false)
    }

    // Sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Remove password from response
    const sanitizedUsers = users?.map(({ password, ...user }) => user) || []

    return NextResponse.json({
      users: sanitizedUsers,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
