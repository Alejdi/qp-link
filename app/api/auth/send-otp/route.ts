import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Store OTP in database (you'll need to create this table)
    // For now, we'll use a simple approach - store in a verification_codes table
    const { error: deleteError } = await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('phone_number', phoneNumber)

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert([
        {
          phone_number: phoneNumber,
          code: otp,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ])

    if (insertError) {
      console.error('Error storing OTP:', insertError)
      // If table doesn't exist, we'll continue anyway for demo purposes
    }

    // Send OTP via WhatsApp using WhatsApp Business API
    // For production, you would integrate with:
    // - Twilio WhatsApp API
    // - WhatsApp Business Cloud API
    // - Other WhatsApp Business Solution Providers

    // For now, we'll simulate the sending (replace with actual API call)
    const whatsappSent = await sendWhatsAppOTP(phoneNumber, otp)

    if (!whatsappSent) {
      // Fallback: In development, just return success and log the OTP
      console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your WhatsApp',
      // Remove this in production - only for development/testing
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}

// Function to send WhatsApp message
// Replace this with your actual WhatsApp API integration
async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    // Example using Twilio WhatsApp API:
    // const accountSid = process.env.TWILIO_ACCOUNT_SID
    // const authToken = process.env.TWILIO_AUTH_TOKEN
    // const client = require('twilio')(accountSid, authToken)
    //
    // await client.messages.create({
    //   from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
    //   to: `whatsapp:${phoneNumber}`,
    //   body: `Your QP Link verification code is: ${otp}. This code expires in 10 minutes.`
    // })

    // Example using WhatsApp Business Cloud API:
    // const response = await fetch(
    //   `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to: phoneNumber.replace('+', ''),
    //       type: 'template',
    //       template: {
    //         name: 'verification_code',
    //         language: { code: 'en' },
    //         components: [
    //           {
    //             type: 'body',
    //             parameters: [{ type: 'text', text: otp }],
    //           },
    //         ],
    //       },
    //     }),
    //   }
    // )

    // For development, just log and return true
    console.log(`WhatsApp OTP would be sent to ${phoneNumber}: ${otp}`)
    return true
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return false
  }
}
