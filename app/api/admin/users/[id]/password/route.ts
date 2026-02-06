import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import bcrypt from 'bcryptjs'

// POST - Reset user password (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Don't allow changing your own password via admin panel
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot reset your own password via admin panel. Use account settings.' },
        { status: 400 }
      )
    }

    const { password, sendEmail = false } = await req.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', params.id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', params.id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      'reset_user_password',
      'user',
      params.id,
      { user_email: user.email, send_email: sendEmail }
    )

    // TODO: Send email notification to user if sendEmail is true
    // await sendPasswordResetNotification(user.email, user.name)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
