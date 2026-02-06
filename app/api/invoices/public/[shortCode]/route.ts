import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('products')
      .select('id, name, description, price, image_url, upi_id, expires_at, is_active, short_code')
      .eq('short_code', params.shortCode)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Increment view count (optional, don't fail if it errors)
    const { error: analyticsError } = await supabaseAdmin
      .from('product_analytics')
      .insert({
        product_id: invoice.id,
        event_type: 'view',
        event_data: {
          user_agent: req.headers.get('user-agent'),
          referer: req.headers.get('referer'),
        },
      })

    if (analyticsError) {
      console.error('Analytics error:', analyticsError)
    }

    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error('Fetch public invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}
