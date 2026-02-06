import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, ADMIN_EMAIL } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.email === ADMIN_EMAIL || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    let query = supabaseAdmin
      .from('banned_ips')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('ip_address', `%${search}%`)
    }

    const { data: ips, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching banned IPs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch banned IPs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ips: ips || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch banned IPs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banned IPs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.email === ADMIN_EMAIL || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { ip_address, reason, expires_at } = body

    if (!ip_address) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      )
    }

    // Check if IP is already banned
    const { data: existing } = await supabaseAdmin
      .from('banned_ips')
      .select('id')
      .eq('ip_address', ip_address)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'IP is already banned' },
        { status: 400 }
      )
    }

    const { data: bannedIP, error } = await supabaseAdmin
      .from('banned_ips')
      .insert({
        ip_address,
        reason: reason || 'Manual ban by admin',
        banned_by: session.user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error banning IP:', error)
      return NextResponse.json(
        { error: 'Failed to ban IP' },
        { status: 500 }
      )
    }

    // Log admin action
    await supabaseAdmin.from('activity_logs').insert({
      user_id: session.user.id,
      action: `Banned IP: ${ip_address}`,
      details: { ip_address, reason },
    })

    return NextResponse.json({ ip: bannedIP })
  } catch (error) {
    console.error('Failed to ban IP:', error)
    return NextResponse.json(
      { error: 'Failed to ban IP' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.email === ADMIN_EMAIL || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const ip_address = searchParams.get('ip')

    if (!id && !ip_address) {
      return NextResponse.json(
        { error: 'ID or IP address is required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin.from('banned_ips').delete()

    if (id) {
      query = query.eq('id', id)
    } else if (ip_address) {
      query = query.eq('ip_address', ip_address)
    }

    const { error } = await query

    if (error) {
      console.error('Error unbanning IP:', error)
      return NextResponse.json(
        { error: 'Failed to unban IP' },
        { status: 500 }
      )
    }

    // Log admin action
    await supabaseAdmin.from('activity_logs').insert({
      user_id: session.user.id,
      action: `Unbanned IP: ${ip_address || id}`,
      details: { id, ip_address },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unban IP:', error)
    return NextResponse.json(
      { error: 'Failed to unban IP' },
      { status: 500 }
    )
  }
}
