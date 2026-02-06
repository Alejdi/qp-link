import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

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

    const { email, userId } = await req.json()

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      )
    }

    // Generate verification token (valid for 24 hours)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token in database
    const { error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString()
      })

    if (tokenError) {
      console.error('Error storing verification token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      )
    }

    // Create verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      // Fallback to console logging if no API key is set (for development)
      console.log('='.repeat(80))
      console.log('EMAIL VERIFICATION (Development Mode - No API Key)')
      console.log('='.repeat(80))
      console.log(`To: ${email}`)
      console.log(`Subject: Verify your QP Link email address`)
      console.log(`\nVerification Link:\n${verificationUrl}`)
      console.log(`\nThis link will expire in 24 hours.\n`)
      console.log('='.repeat(80))

      return NextResponse.json({
        success: true,
        message: 'Verification email logged to console (dev mode)',
        verificationUrl // Only return in dev mode for testing
      })
    }

    // Send actual email with Resend
    const resend = new Resend(resendApiKey)

    try {
      await resend.emails.send({
        from: 'QP Link <onboarding@resend.dev>', // Change this after domain verification
        to: email,
        subject: 'Verify your QP Link email address',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f8f8;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #21255B; font-size: 28px; font-weight: bold; margin: 0;">QP Link</h1>
                </div>

                <!-- Main Card -->
                <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <h2 style="color: #21255B; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">Welcome to QP Link!</h2>

                  <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                    Thank you for signing up. Please verify your email address to get started.
                  </p>

                  <!-- Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Verify Email Address
                    </a>
                  </div>

                  <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="color: #21255B; font-size: 14px; word-break: break-all; margin: 8px 0 0 0;">
                    ${verificationUrl}
                  </p>

                  <!-- Expiry Notice -->
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                    <p style="color: #9CA3AF; font-size: 14px; line-height: 20px; margin: 0;">
                      This verification link will expire in 24 hours.
                    </p>
                  </div>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 32px;">
                  <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
                    If you didn't create an account with QP Link, you can safely ignore this email.
                  </p>
                  <p style="color: #9CA3AF; font-size: 12px; margin: 16px 0 0 0;">
                    &copy; ${new Date().getFullYear()} QP Link. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      })
    } catch (emailError: any) {
      console.error('Resend email error:', emailError)
      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })
  } catch (error: any) {
    console.error('Send verification email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
