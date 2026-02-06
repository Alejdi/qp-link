import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'

// GET - Get user's active sessions
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user sessions from user_sessions table
    const { data: sessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', params.id)
      .eq('is_active', true)
      .order('last_activity', { ascending: false })

    if (error) {
      console.error('Failed to fetch sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({
      sessions: sessions || [],
      count: sessions?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke all user sessions (force logout)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details for logging
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', params.id)
      .single()

    // Mark all sessions as inactive
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', params.id)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to revoke sessions:', error)
      return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      'revoke_user_sessions',
      'user',
      params.id,
      { user_email: user?.email }
    )

    return NextResponse.json({
      success: true,
      message: 'All user sessions revoked successfully',
    })
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
