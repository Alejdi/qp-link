import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List trusted devices
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: devices, error } = await supabaseAdmin
      .from('trusted_devices')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_used', { ascending: false })

    if (error) {
      console.error('Error fetching devices:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    return NextResponse.json({
      devices: devices || []
    })
  } catch (error) {
    console.error('Failed to fetch devices:', error)
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}
