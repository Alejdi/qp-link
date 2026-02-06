import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as speakeasy from 'speakeasy'

// POST - Disable 2FA (requires verification)
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

    // Get 2FA settings
    const { data: twoFA } = await supabaseAdmin
      .from('user_2fa')
      .select('secret, is_enabled')
      .eq('user_id', session.user.id)
      .single()

    if (!twoFA?.is_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token: code,
      window: 2
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Disable 2FA using database function
    const { error } = await supabaseAdmin.rpc('disable_2fa', {
      p_user_id: session.user.id
    })

    if (error) {
      console.error('Error disabling 2FA:', error)
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    // Clear trusted devices
    await supabaseAdmin
      .from('trusted_devices')
      .delete()
      .eq('user_id', session.user.id)

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    })
  } catch (error) {
    console.error('Failed to disable 2FA:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
