import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as crypto from 'crypto'

// POST - Check if user has 2FA enabled and if device is trusted
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get user by email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!user) {
      return NextResponse.json({ requires2FA: false })
    }

    // Check if user has 2FA enabled
    const { data: twoFA } = await supabaseAdmin
      .from('user_2fa')
      .select('is_enabled')
      .eq('user_id', user.id)
      .single()

    if (!twoFA || !twoFA.is_enabled) {
      return NextResponse.json({ requires2FA: false })
    }

    // Check if device is trusted
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}:${ip}`)
      .digest('hex')

    const { data: isTrusted } = await supabaseAdmin.rpc('is_device_trusted', {
      p_user_id: user.id,
      p_device_fingerprint: deviceFingerprint
    })

    return NextResponse.json({
      requires2FA: true,
      deviceTrusted: isTrusted || false
    })
  } catch (error) {
    console.error('Failed to check 2FA:', error)
    return NextResponse.json({ error: 'Failed to check 2FA' }, { status: 500 })
  }
}
