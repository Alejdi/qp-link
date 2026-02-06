import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List webhook deliveries
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify webhook ownership
    const { data: webhook } = await supabaseAdmin
      .from('user_webhooks')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!webhook || webhook.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Fetch deliveries
    const { data: deliveries, error, count } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching deliveries:', error)
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
    }

    return NextResponse.json({
      deliveries,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Failed to fetch deliveries:', error)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}
