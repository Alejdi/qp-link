import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create a fresh admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if request is FormData (with file uploads) or JSON
    const contentType = req.headers.get('content-type') || ''

    let name: string
    let email: string
    let password: string
    let phoneNumber: string | undefined
    let idFront: File | null = null
    let idBack: File | null = null

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with file uploads
      const formData = await req.formData()

      name = formData.get('name') as string
      email = formData.get('email') as string
      password = formData.get('password') as string
      phoneNumber = formData.get('phoneNumber') as string
      idFront = formData.get('idFront') as File
      idBack = formData.get('idBack') as File

      // Validate required fields
      if (!name || !email || !password) {
        return NextResponse.json(
          { error: 'Name, email, and password are required' },
          { status: 400 }
        )
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }
    } else {
      // Handle JSON request (legacy support)
      const body = await req.json()
      const validated = signupSchema.parse(body)
      name = validated.name
      email = validated.email
      password = validated.password
      phoneNumber = validated.phoneNumber
    }

    console.log('Attempting signup for:', email)

    // Check if user already exists by email
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if phone number is already registered (if provided)
    if (phoneNumber) {
      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single()

      if (existingPhone) {
        return NextResponse.json(
          { error: 'This phone number is already registered' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Upload ID card images to Supabase Storage (if provided)
    let idFrontUrl: string | null = null
    let idBackUrl: string | null = null

    if (idFront && idBack) {
      const timestamp = Date.now()
      const emailPrefix = email.replace(/[^a-zA-Z0-9]/g, '_')

      // Upload front ID
      const frontArrayBuffer = await idFront.arrayBuffer()
      const frontBuffer = new Uint8Array(frontArrayBuffer)
      const frontFileName = `${emailPrefix}_${timestamp}_front.${idFront.name.split('.').pop()}`

      const { data: frontUpload, error: frontError } = await supabaseAdmin
        .storage
        .from('id-documents')
        .upload(frontFileName, frontBuffer, {
          contentType: idFront.type,
          upsert: true
        })

      if (frontError) {
        console.error('Error uploading front ID:', frontError)
        // Continue without ID upload - user can upload later
      } else {
        const { data: frontUrlData } = supabaseAdmin
          .storage
          .from('id-documents')
          .getPublicUrl(frontFileName)
        idFrontUrl = frontUrlData.publicUrl
      }

      // Upload back ID
      const backArrayBuffer = await idBack.arrayBuffer()
      const backBuffer = new Uint8Array(backArrayBuffer)
      const backFileName = `${emailPrefix}_${timestamp}_back.${idBack.name.split('.').pop()}`

      const { data: backUpload, error: backError } = await supabaseAdmin
        .storage
        .from('id-documents')
        .upload(backFileName, backBuffer, {
          contentType: idBack.type,
          upsert: true
        })

      if (backError) {
        console.error('Error uploading back ID:', backError)
      } else {
        const { data: backUrlData } = supabaseAdmin
          .storage
          .from('id-documents')
          .getPublicUrl(backFileName)
        idBackUrl = backUrlData.publicUrl
      }
    }

    // Create user with all fields
    const userData: Record<string, any> = {
      name,
      email,
      password: hashedPassword,
    }

    // Add optional fields if provided
    if (phoneNumber) {
      userData.phone_number = phoneNumber
      userData.phone_verified = true // They've already verified via OTP
    }

    if (idFrontUrl) {
      userData.id_front_url = idFrontUrl
    }

    if (idBackUrl) {
      userData.id_back_url = idBackUrl
    }

    // Set verification status
    userData.id_verified = !!(idFrontUrl && idBackUrl) // Pending manual review
    userData.kyc_status = idFrontUrl && idBackUrl ? 'pending' : 'not_submitted'

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select('id, name, email')
      .single()

    if (error) {
      console.error('Supabase insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { error: `Failed to create user: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('User created successfully:', user.id)

    // Send verification email
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id
        })
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail the signup if email sending fails
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        message: 'Account created successfully. Please check your email to verify your account.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: `Something went wrong: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
