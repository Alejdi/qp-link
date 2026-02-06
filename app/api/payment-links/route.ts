import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List user's payment links
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: links, error } = await supabaseAdmin
      .from('payment_links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment links:', error)
      return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
    }

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Failed to fetch payment links:', error)
    return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
  }
}

// POST - Create new payment link
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      amount,
      minAmount,
      maxAmount,
      currency,
      allowCustomAmount,
      linkType,
      maxUses,
      expiresAt,
      requireEmail,
      requireName,
      successMessage,
      redirectUrl
    } = body

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 characters)' }, { status: 400 })
    }

    if (!allowCustomAmount && (!amount || amount <= 0)) {
      return NextResponse.json({ error: 'Amount is required when custom amount is disabled' }, { status: 400 })
    }

    if (amount && (amount < 1 || amount > 1000000)) {
      return NextResponse.json({ error: 'Amount must be between €1 and €1,000,000' }, { status: 400 })
    }

    // Generate unique short code
    let shortCode = generateSlug(title)
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('payment_links')
        .select('id')
        .eq('short_code', shortCode)
        .single()

      if (!existing) break

      shortCode = `${generateSlug(title)}-${Math.random().toString(36).substring(2, 6)}`
      attempts++
    }

    if (attempts === 5) {
      // Fallback to random code
      const { data: randomCode } = await supabaseAdmin.rpc('generate_payment_link_code')
      shortCode = randomCode
    }

    const { data: link, error } = await supabaseAdmin
      .from('payment_links')
      .insert({
        user_id: session.user.id,
        title,
        description,
        short_code: shortCode,
        amount,
        min_amount: minAmount || 1.00,
        max_amount: maxAmount,
        currency: currency || 'EUR',
        allow_custom_amount: allowCustomAmount || false,
        link_type: linkType || 'one_time',
        max_uses: maxUses,
        expires_at: expiresAt,
        require_email: requireEmail !== false,
        require_name: requireName || false,
        success_message: successMessage,
        redirect_url: redirectUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment link:', error)
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    return NextResponse.json({ link }, { status: 201 })
  } catch (error) {
    console.error('Failed to create payment link:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30)
}
