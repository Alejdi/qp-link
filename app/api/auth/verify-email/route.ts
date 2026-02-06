import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find the token in database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    const expiresAt = new Date(tokenData.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    // Mark user as email verified
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ email_verified: true })
      .eq('id', tokenData.user_id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }

    // Mark token as used
    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used: true })
      .eq('token', token)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error: any) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify email' },
      { status: 500 }
    )
  }
}
