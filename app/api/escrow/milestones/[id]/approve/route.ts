import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Approve a milestone
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { approvalNotes } = body

    // Verify milestone exists and user has access
    const { data: milestone } = await supabaseAdmin
      .from('escrow_milestones')
      .select(`
        *,
        escrow:escrows(buyer_id, seller_id, status)
      `)
      .eq('id', params.id)
      .single()

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const escrow = milestone.escrow as any

    if (escrow.buyer_id !== session.user.id && escrow.seller_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Don't allow approval if milestone already released or rejected
    if (milestone.status === 'released' || milestone.status === 'rejected') {
      return NextResponse.json({ error: `Milestone is already ${milestone.status}` }, { status: 400 })
    }

    // Approve milestone using database function
    const { data: readyToRelease, error } = await supabaseAdmin.rpc('approve_milestone', {
      p_milestone_id: params.id,
      p_user_id: session.user.id,
      p_approval_notes: approvalNotes || null
    })

    if (error) {
      console.error('Error approving milestone:', error)
      return NextResponse.json({ error: 'Failed to approve milestone' }, { status: 500 })
    }

    // Fetch updated milestone
    const { data: updatedMilestone } = await supabaseAdmin
      .from('escrow_milestones')
      .select('*')
      .eq('id', params.id)
      .single()

    return NextResponse.json({
      milestone: updatedMilestone,
      readyToRelease
    })
  } catch (error) {
    console.error('Failed to approve milestone:', error)
    return NextResponse.json({ error: 'Failed to approve milestone' }, { status: 500 })
  }
}
