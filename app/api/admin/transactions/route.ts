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
    const status = searchParams.get('status') || ''

    // Get all products with user info (products act as invoices)
    let query = supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        short_code,
        stripe_url,
        created_at,
        user_id,
        users:user_id (name, email)
      `, { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,short_code.ilike.%${search}%`)
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Get payment records if payments table exists
    let payments: any[] = []
    try {
      const { data: paymentData } = await supabaseAdmin
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      payments = paymentData || []
    } catch (e) {
      // Payments table might not exist
    }

    // Calculate summary stats
    const { data: allProducts } = await supabaseAdmin
      .from('products')
      .select('price')

    const totalInvoiceValue = allProducts?.reduce((sum, p) => sum + (p.price || 0), 0) || 0

    return NextResponse.json({
      transactions: products?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        shortCode: p.short_code,
        stripeUrl: p.stripe_url,
        createdAt: p.created_at,
        userId: p.user_id,
        user: Array.isArray(p.users) ? p.users[0] : p.users,
        status: 'created', // Since we don't have payment tracking yet
      })) || [],
      payments,
      summary: {
        totalInvoices: count || 0,
        totalInvoiceValue,
        paidInvoices: payments.filter(p => p.status === 'completed').length,
        pendingInvoices: (count || 0) - payments.filter(p => p.status === 'completed').length,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
