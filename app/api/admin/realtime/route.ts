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

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get users active in last 5 minutes (considered "online")
    const { data: activeUsers, error: activeError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, current_page, last_active, country')
      .gte('last_active', fiveMinutesAgo.toISOString())
      .order('last_active', { ascending: false })

    if (activeError) {
      console.error('Error fetching active users:', activeError)
    }

    // Get recent activity logs
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action,
        details,
        created_at,
        users:user_id (name, email)
      `)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (activityError) {
      console.error('Error fetching activity:', activityError)
    }

    // Get user sessions (if table exists)
    let activeSessions: any[] = []
    try {
      const { data: sessions } = await supabaseAdmin
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('last_activity', fiveMinutesAgo.toISOString())

      activeSessions = sessions || []
    } catch (e) {
      // Table might not exist yet
    }

    // Count users by current page
    const pageDistribution: Record<string, number> = {}
    activeUsers?.forEach(user => {
      const page = user.current_page || 'Unknown'
      pageDistribution[page] = (pageDistribution[page] || 0) + 1
    })

    // Count users by country
    const countryDistribution: Record<string, number> = {}
    activeUsers?.forEach(user => {
      const country = user.country || 'Unknown'
      countryDistribution[country] = (countryDistribution[country] || 0) + 1
    })

    return NextResponse.json({
      stats: {
        onlineNow: activeUsers?.length || 0,
        activeSessions: activeSessions.length,
      },
      activeUsers: activeUsers?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        currentPage: user.current_page || 'Unknown',
        lastActive: user.last_active,
        country: user.country,
      })) || [],
      recentActivity: recentActivity?.map(activity => ({
        id: activity.id,
        userId: activity.user_id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.created_at,
        user: Array.isArray(activity.users) ? activity.users[0] : activity.users,
      })) || [],
      pageDistribution: Object.entries(pageDistribution)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count),
      countryDistribution: Object.entries(countryDistribution)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('Failed to fetch realtime data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    )
  }
}
