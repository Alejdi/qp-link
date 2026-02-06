import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get current 2FA status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: twoFA } = await supabaseAdmin
      .from('user_2fa')
      .select('is_enabled, backup_codes')
      .eq('user_id', session.user.id)
      .single()

    if (!twoFA) {
      return NextResponse.json({
        isEnabled: false,
        backupCodesRemaining: 0
      })
    }

    // Count non-null backup codes (used codes are set to null)
    const backupCodesRemaining = (twoFA.backup_codes || []).filter((code: string | null) => code !== null).length

    return NextResponse.json({
      isEnabled: twoFA.is_enabled,
      backupCodesRemaining
    })
  } catch (error) {
    console.error('Failed to get 2FA status:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
