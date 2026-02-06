import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Release milestone funds
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Only buyer can release funds
    if (escrow.buyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the buyer can release milestone funds' }, { status: 403 })
    }

    // Verify milestone is approved
    if (milestone.status !== 'approved') {
      return NextResponse.json({ error: 'Milestone must be approved before release' }, { status: 400 })
    }

    // Release milestone using database function
    const { data: transactionId, error } = await supabaseAdmin.rpc('release_milestone', {
      p_milestone_id: params.id,
      p_released_by: session.user.id
    })

    if (error) {
      console.error('Error releasing milestone:', error)
      return NextResponse.json({ error: 'Failed to release milestone' }, { status: 500 })
    }

    // Fetch updated milestone
    const { data: updatedMilestone } = await supabaseAdmin
      .from('escrow_milestones')
      .select('*')
      .eq('id', params.id)
      .single()

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: session.user.id,
      action: 'escrow_milestone_released',
      resource_type: 'escrow_milestone',
      resource_id: params.id,
      metadata: {
        milestone_title: updatedMilestone?.title,
        amount: updatedMilestone?.released_amount,
        transaction_id: transactionId
      }
    })

    return NextResponse.json({
      milestone: updatedMilestone,
      transactionId
    })
  } catch (error) {
    console.error('Failed to release milestone:', error)
    return NextResponse.json({ error: 'Failed to release milestone' }, { status: 500 })
  }
}
