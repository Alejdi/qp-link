import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { shortId: string } }
) {
  try {
    const { shortId } = params

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        short_code,
        name,
        description,
        price,
        image_url,
        stripe_url,
        payment_status,
        user_id,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('short_code', shortId)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { shortId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { shortId } = params

    // First, find the product to verify ownership
    // The shortId param could be either the UUID id or the short_id
    let product = null

    // Try finding by id first
    const { data: productById } = await supabaseAdmin
      .from('products')
      .select('id, user_id')
      .eq('id', shortId)
      .eq('user_id', session.user.id)
      .single()

    if (productById) {
      product = productById
    } else {
      // Try finding by short_code
      const { data: productByShortId } = await supabaseAdmin
        .from('products')
        .select('id, user_id')
        .eq('short_code', shortId)
        .eq('user_id', session.user.id)
        .single()

      product = productByShortId
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or not authorized' },
        { status: 404 }
      )
    }

    // Delete the product (payments will be cascade deleted due to FK constraint)
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', product.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
