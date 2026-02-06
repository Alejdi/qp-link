import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as speakeasy from 'speakeasy'
import { createHash } from 'crypto'

// POST - Verify 2FA code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { code, useBackupCode, rememberDevice } = body

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    // Get 2FA settings
    const { data: twoFA } = await supabaseAdmin
      .from('user_2fa')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_enabled', true)
      .single()

    if (!twoFA) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
    }

    // Check if locked
    if (twoFA.locked_until && new Date(twoFA.locked_until) > new Date()) {
      return NextResponse.json({
        error: 'Account locked due to too many failed attempts',
        lockedUntil: twoFA.locked_until
      }, { status: 429 })
    }

    let isValid = false

    if (useBackupCode) {
      // Verify backup code
      const codeHash = createHash('sha256').update(code.toUpperCase()).digest('hex')
      const { data: used } = await supabaseAdmin.rpc('use_backup_code', {
        p_user_id: session.user.id,
        p_code_hash: codeHash
      })

      isValid = used === true
    } else {
      // Verify TOTP code
      isValid = speakeasy.totp.verify({
        secret: twoFA.secret,
        encoding: 'base32',
        token: code,
        window: 2
      })

      if (isValid) {
        await supabaseAdmin.rpc('verify_totp', {
          p_user_id: session.user.id,
          p_code: code,
          p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          p_user_agent: req.headers.get('user-agent')
        })
      }
    }

    if (!isValid) {
      // Record failed attempt
      await supabaseAdmin.rpc('record_failed_2fa', {
        p_user_id: session.user.id,
        p_verification_type: useBackupCode ? 'backup_code' : 'totp',
        p_failure_reason: 'Invalid code',
        p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        p_user_agent: req.headers.get('user-agent')
      })

      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Handle "remember this device"
    let deviceToken = null
    if (rememberDevice) {
      const deviceFingerprint = createHash('sha256')
        .update(req.headers.get('user-agent') || '')
        .update(req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '')
        .digest('hex')

      const { data: deviceId } = await supabaseAdmin.rpc('add_trusted_device', {
        p_user_id: session.user.id,
        p_device_fingerprint: deviceFingerprint,
        p_device_name: req.headers.get('user-agent')?.substring(0, 100),
        p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        p_user_agent: req.headers.get('user-agent'),
        p_trust_duration_days: 30
      })

      deviceToken = deviceFingerprint
    }

    return NextResponse.json({
      success: true,
      verified: true,
      deviceToken
    })
  } catch (error) {
    console.error('Failed to verify 2FA:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
