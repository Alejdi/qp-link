import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    // Retrieve stored OTP from database
    const { data: verificationCode, error } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    // For development/demo purposes, accept a specific test OTP
    const isDevMode = process.env.NODE_ENV === 'development'
    const testOtp = '123456' // Test OTP for development

    if (error || !verificationCode) {
      // If no verification code found but in dev mode with test OTP
      if (isDevMode && otp === testOtp) {
        return NextResponse.json({
          success: true,
          message: 'Phone number verified successfully',
        })
      }

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    const expiresAt = new Date(verificationCode.expires_at)
    if (new Date() > expiresAt) {
      // Delete expired OTP
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('phone_number', phoneNumber)

      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (verificationCode.code !== otp) {
      // Allow test OTP in development
      if (!(isDevMode && otp === testOtp)) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }
    }

    // OTP verified successfully - delete the used code
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('phone_number', phoneNumber)

    // Mark phone as verified (store verification status)
    // This could be stored in a session or temporary storage
    // For now, we'll just return success and handle it on the client

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
