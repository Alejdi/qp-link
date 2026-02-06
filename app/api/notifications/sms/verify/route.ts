import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Send SMS verification code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phoneNumber, code } = body

    if (code) {
      // Verify the code
      const { data: verification } = await supabaseAdmin
        .from('sms_verifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('phone_number', phoneNumber)
        .eq('code', code)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!verification) {
        // Increment attempts
        await supabaseAdmin
          .from('sms_verifications')
          .update({ attempts: supabaseAdmin.raw('attempts + 1') })
          .eq('user_id', session.user.id)
          .eq('phone_number', phoneNumber)
          .is('verified_at', null)

        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
      }

      // Mark as verified
      await supabaseAdmin
        .from('sms_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', verification.id)

      // Update user preferences
      await supabaseAdmin
        .from('notification_preferences')
        .update({
          sms_phone_number: phoneNumber,
          sms_phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)

      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully'
      })
    } else {
      // Send verification code
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Store verification code
      await supabaseAdmin.from('sms_verifications').insert([{
        user_id: session.user.id,
        phone_number: phoneNumber,
        code: verificationCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }])

      // TODO: Send SMS using Twilio, AWS SNS, or other SMS provider
      // For now, we'll just return success (in production, integrate with SMS service)
      console.log(`SMS verification code for ${phoneNumber}: ${verificationCode}`)

      return NextResponse.json({
        success: true,
        message: 'Verification code sent',
        // Only for development - remove in production
        devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      })
    }
  } catch (error) {
    console.error('Failed to handle SMS verification:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
