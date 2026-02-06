import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE - Unblock an entity (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('blocked_entities')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error unblocking entity:', error)
      return NextResponse.json({ error: 'Failed to unblock entity' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Entity unblocked successfully'
    })
  } catch (error) {
    console.error('Failed to unblock entity:', error)
    return NextResponse.json({ error: 'Failed to unblock entity' }, { status: 500 })
  }
}
