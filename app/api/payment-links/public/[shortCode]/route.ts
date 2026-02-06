import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Public endpoint to fetch payment link details
export async function GET(
  req: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { data: link, error } = await supabaseAdmin
      .from('payment_links')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email
        )
      `)
      .eq('short_code', params.shortCode)
      .single()

    if (error || !link) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      )
    }

    // Don't return link if inactive
    if (!link.is_active) {
      return NextResponse.json(
        { error: 'This payment link is inactive' },
        { status: 403 }
      )
    }

    // Check if expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This payment link has expired' },
        { status: 410 }
      )
    }

    // Check max uses
    if (link.max_uses && link.uses_count >= link.max_uses) {
      return NextResponse.json(
        { error: 'This payment link has reached its maximum number of uses' },
        { status: 410 }
      )
    }

    return NextResponse.json({ link })
  } catch (error) {
    console.error('Error fetching payment link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment link' },
      { status: 500 }
    )
  }
}
