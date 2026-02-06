import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { createHash, randomBytes } from 'crypto'

// POST - Generate 2FA setup (secret + QR code)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if 2FA is already enabled
    const { data: existing2FA } = await supabaseAdmin
      .from('user_2fa')
      .select('is_enabled')
      .eq('user_id', session.user.id)
      .single()

    if (existing2FA?.is_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `QP Link (${session.user.email})`,
      issuer: 'QP Link'
    })

    // Generate backup codes (10 codes)
    const backupCodes: string[] = []
    const hashedBackupCodes: string[] = []

    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase()
      backupCodes.push(code)

      // Hash backup codes for storage
      const hash = createHash('sha256').update(code).digest('hex')
      hashedBackupCodes.push(hash)
    }

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Store temporary 2FA setup (not enabled yet)
    await supabaseAdmin
      .from('user_2fa')
      .upsert({
        user_id: session.user.id,
        secret: secret.base32,
        backup_codes: hashedBackupCodes,
        is_enabled: false
      })

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      backupCodes, // Only returned once!
      otpauthUrl: secret.otpauth_url
    })
  } catch (error) {
    console.error('Failed to setup 2FA:', error)
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
  }
}
