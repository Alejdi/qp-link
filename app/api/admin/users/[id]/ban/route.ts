import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { banUser, unbanUser } from '@/lib/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = params
    const { action, reason } = await req.json()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Don't allow banning yourself
    if (session.user.id === id) {
      return NextResponse.json({ error: 'Cannot ban your own account' }, { status: 400 })
    }

    // Get client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown'

    if (action === 'ban') {
      if (!reason) {
        return NextResponse.json({ error: 'Ban reason is required' }, { status: 400 })
      }

      const result = await banUser(session.user.id, id, reason, ip)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'User has been banned' })
    } else if (action === 'unban') {
      const result = await unbanUser(session.user.id, id, ip)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'User has been unbanned' })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error banning/unbanning user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
