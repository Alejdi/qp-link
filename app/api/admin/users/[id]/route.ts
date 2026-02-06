import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'

// Get single user details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get user data
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's products count
    const { count: productsCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)

    // Get user's products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Remove password from response
    const { password, ...sanitizedUser } = user

    return NextResponse.json({
      user: sanitizedUser,
      productsCount: productsCount || 0,
      products: products || [],
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user (role, subscription, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = params
    const body = await req.json()

    const allowedFields = ['role', 'subscription_tier', 'subscription_expires_at', 'kyc_status', 'id_verified']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session?.user?.id || 'unknown',
      'update_user',
      'user',
      id,
      { fields: Object.keys(updateData), newValues: updateData }
    )

    const { password, ...sanitizedUser } = user
    return NextResponse.json({ user: sanitizedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = params

    // Don't allow deleting yourself
    if (session?.user?.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete user's products first
    await supabaseAdmin
      .from('products')
      .delete()
      .eq('user_id', id)

    // Delete user
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session?.user?.id || 'unknown',
      'delete_user',
      'user',
      id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
