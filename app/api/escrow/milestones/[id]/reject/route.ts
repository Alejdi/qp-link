import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Reject a milestone
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
    const { rejectionReason } = body

    if (!rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Verify milestone exists and user is the buyer
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

    // Only buyer can reject
    if (escrow.buyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the buyer can reject milestones' }, { status: 403 })
    }

    // Don't allow rejection if already released
    if (milestone.status === 'released') {
      return NextResponse.json({ error: 'Cannot reject a released milestone' }, { status: 400 })
    }

    // Reject milestone using database function
    const { error } = await supabaseAdmin.rpc('reject_milestone', {
      p_milestone_id: params.id,
      p_user_id: session.user.id,
      p_rejection_reason: rejectionReason
    })

    if (error) {
      console.error('Error rejecting milestone:', error)
      return NextResponse.json({ error: 'Failed to reject milestone' }, { status: 500 })
    }

    // Fetch updated milestone
    const { data: updatedMilestone } = await supabaseAdmin
      .from('escrow_milestones')
      .select('*')
      .eq('id', params.id)
      .single()

    return NextResponse.json({ milestone: updatedMilestone })
  } catch (error) {
    console.error('Failed to reject milestone:', error)
    return NextResponse.json({ error: 'Failed to reject milestone' }, { status: 500 })
  }
}
