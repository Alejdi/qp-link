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

    // Check admin access
    const isAdmin = session.user.email === ADMIN_EMAIL || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30' // days

    const now = new Date()
    const periodStart = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000)

    // Get user registration trends
    const { data: userTrends } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: true })

    // Group users by date
    const usersByDate: Record<string, number> = {}
    userTrends?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      usersByDate[date] = (usersByDate[date] || 0) + 1
    })

    // Get login activity (from activity_logs if exists, or estimate from last_login_at)
    const { data: loginActivity } = await supabaseAdmin
      .from('users')
      .select('last_login_at')
      .not('last_login_at', 'is', null)
      .gte('last_login_at', periodStart.toISOString())

    const loginsByDate: Record<string, number> = {}
    loginActivity?.forEach(user => {
      if (user.last_login_at) {
        const date = new Date(user.last_login_at).toISOString().split('T')[0]
        loginsByDate[date] = (loginsByDate[date] || 0) + 1
      }
    })

    // Get product/invoice creation trends
    const { data: productTrends } = await supabaseAdmin
      .from('products')
      .select('created_at, price')
      .gte('created_at', periodStart.toISOString())

    const productsByDate: Record<string, number> = {}
    const revenueByDate: Record<string, number> = {}
    productTrends?.forEach(product => {
      const date = new Date(product.created_at).toISOString().split('T')[0]
      productsByDate[date] = (productsByDate[date] || 0) + 1
      revenueByDate[date] = (revenueByDate[date] || 0) + (product.price || 0)
    })

    // Get user geography data
    const { data: geoData } = await supabaseAdmin
      .from('users')
      .select('country')
      .not('country', 'is', null)

    const usersByCountry: Record<string, number> = {}
    geoData?.forEach(user => {
      const country = user.country || 'Unknown'
      usersByCountry[country] = (usersByCountry[country] || 0) + 1
    })

    // Get top countries sorted
    const topCountries = Object.entries(usersByCountry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    // Summary stats
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })

    const { data: revenueData } = await supabaseAdmin
      .from('products')
      .select('price')

    const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.price || 0), 0) || 0

    const { count: activeUsersToday } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

    // Get subscription breakdown
    const { data: subscriptionData } = await supabaseAdmin
      .from('users')
      .select('subscription_tier')

    const subscriptionBreakdown: Record<string, number> = { free: 0, starter: 0, pro: 0, enterprise: 0 }
    subscriptionData?.forEach(user => {
      const tier = user.subscription_tier || 'free'
      subscriptionBreakdown[tier] = (subscriptionBreakdown[tier] || 0) + 1
    })

    // Generate date labels for charts
    const dateLabels: string[] = []
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dateLabels.push(date.toISOString().split('T')[0])
    }

    // Fill in missing dates with 0
    const registrations = dateLabels.map(date => usersByDate[date] || 0)
    const logins = dateLabels.map(date => loginsByDate[date] || 0)
    const products = dateLabels.map(date => productsByDate[date] || 0)
    const revenue = dateLabels.map(date => revenueByDate[date] || 0)

    return NextResponse.json({
      summary: {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalRevenue,
        activeUsersToday: activeUsersToday || 0,
      },
      charts: {
        labels: dateLabels.map(d => {
          const date = new Date(d)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        registrations,
        logins,
        products,
        revenue,
      },
      geography: topCountries,
      subscriptions: Object.entries(subscriptionBreakdown).map(([tier, count]) => ({
        tier,
        count,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
