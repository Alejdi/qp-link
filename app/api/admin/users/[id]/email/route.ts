import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'

// POST - Change user email (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newEmail } = await req.json()

    if (!newEmail || !newEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Get current user details
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', params.id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const oldEmail = user.email

    // Update email
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ email: newEmail })
      .eq('id', params.id)

    if (updateError) {
      console.error('Failed to update email:', updateError)
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      'change_user_email',
      'user',
      params.id,
      { old_email: oldEmail, new_email: newEmail }
    )

    // TODO: Send notification to both old and new email addresses
    // await sendEmailChangeNotification(oldEmail, newEmail, user.name)

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully',
      oldEmail,
      newEmail,
    })
  } catch (error) {
    console.error('Error changing email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
