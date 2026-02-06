import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Mark notification as read
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notification belongs to user
    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!notification || notification.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Mark as read using database function
    const { error } = await supabaseAdmin.rpc('mark_notification_read', {
      p_notification_id: params.id
    })

    if (error) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}
