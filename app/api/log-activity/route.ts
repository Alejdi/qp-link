import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, details, page } = await req.json()

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    await logActivity({
      userId: session.user.id,
      action,
      details: details || {},
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      page,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
