import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List all active currencies
export async function GET(req: NextRequest) {
  try {
    const { data: currencies, error } = await supabaseAdmin
      .from('currencies')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) {
      console.error('Error fetching currencies:', error)
      return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 })
    }

    return NextResponse.json({ currencies })
  } catch (error) {
    console.error('Failed to fetch currencies:', error)
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 })
  }
}
