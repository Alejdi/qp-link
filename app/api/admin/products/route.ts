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
    const userId = searchParams.get('userId') || ''

    let query = supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        short_code,
        stripe_url,
        image_url,
        created_at,
        user_id,
        users:user_id (name, email)
      `, { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,short_code.ilike.%${search}%`)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products: products?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        shortCode: p.short_code,
        stripeUrl: p.stripe_url,
        imageUrl: p.image_url,
        createdAt: p.created_at,
        userId: p.user_id,
        user: Array.isArray(p.users) ? p.users[0] : p.users,
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    // Log admin action
    await supabaseAdmin.from('activity_logs').insert({
      user_id: session.user.id,
      action: `Deleted product: ${productId}`,
      details: { productId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
