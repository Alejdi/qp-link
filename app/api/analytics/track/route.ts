import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { productId, event } = await req.json()

    if (!productId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await supabaseAdmin
      .from('product_analytics')
      .insert({
        product_id: productId,
        event_type: event,
        event_data: {
          user_agent: req.headers.get('user-agent'),
          referer: req.headers.get('referer'),
          timestamp: new Date().toISOString(),
        },
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}
