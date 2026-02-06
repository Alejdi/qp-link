import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hash } from 'bcryptjs'

// Emergency password reset endpoint
// ONLY USE FOR DEVELOPMENT - REMOVE IN PRODUCTION
export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json()

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword required' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12)

    // Update user password
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        email_verified: true
      })
      .eq('email', email)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Password updated for ${email}`,
      user: {
        id: data[0].id,
        email: data[0].email,
        name: data[0].name,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}
