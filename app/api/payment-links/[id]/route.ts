import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH - Update payment link (toggle active, etc)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { is_active } = body

    // Verify ownership
    const { data: link } = await supabaseAdmin
      .from('payment_links')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!link || link.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Update link
    const { data: updated, error } = await supabaseAdmin
      .from('payment_links')
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment link:', error)
      return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 })
    }

    return NextResponse.json({ link: updated })
  } catch (error) {
    console.error('Failed to update payment link:', error)
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 })
  }
}

// DELETE - Delete payment link
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: link } = await supabaseAdmin
      .from('payment_links')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!link || link.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Delete link (cascade will delete related payments)
    const { error } = await supabaseAdmin
      .from('payment_links')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting payment link:', error)
      return NextResponse.json({ error: 'Failed to delete payment link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete payment link:', error)
    return NextResponse.json({ error: 'Failed to delete payment link' }, { status: 500 })
  }
}
