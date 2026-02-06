import { NextResponse } from 'next/server'
import { getPlatformStats } from '@/lib/admin'

export async function GET() {
  try {
    const stats = await getPlatformStats()

    if (!stats) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
