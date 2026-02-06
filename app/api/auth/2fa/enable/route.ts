import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as speakeasy from 'speakeasy'

// POST - Enable 2FA (verify code first)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 })
    }

    // Get pending 2FA setup
    const { data: twoFA } = await supabaseAdmin
      .from('user_2fa')
      .select('secret, is_enabled, backup_codes')
      .eq('user_id', session.user.id)
      .single()

    if (!twoFA || !twoFA.secret) {
      return NextResponse.json({ error: '2FA not initialized. Call /setup first' }, { status: 400 })
    }

    if (twoFA.is_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps before/after for clock drift
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Enable 2FA using database function
    const { error } = await supabaseAdmin.rpc('enable_2fa', {
      p_user_id: session.user.id,
      p_secret: twoFA.secret,
      p_backup_codes: twoFA.backup_codes
    })

    if (error) {
      console.error('Error enabling 2FA:', error)
      return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    })
  } catch (error) {
    console.error('Failed to enable 2FA:', error)
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
  }
}
