import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List milestones for an escrow
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this escrow
    const { data: escrow } = await supabaseAdmin
      .from('escrows')
      .select('buyer_id, seller_id')
      .eq('id', params.id)
      .single()

    if (!escrow || (escrow.buyer_id !== session.user.id && escrow.seller_id !== session.user.id)) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    // Fetch milestones
    const { data: milestones, error } = await supabaseAdmin
      .from('escrow_milestones')
      .select(`
        *,
        evidence:milestone_evidence(*)
      `)
      .eq('escrow_id', params.id)
      .order('sequence_order', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
    }

    return NextResponse.json({ milestones })
  } catch (error) {
    console.error('Failed to fetch milestones:', error)
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
  }
}

// POST - Create a new milestone
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
    const { title, description, percentage, sequenceOrder } = body

    // Validation
    if (!title || !percentage) {
      return NextResponse.json({ error: 'Title and percentage are required' }, { status: 400 })
    }

    if (percentage <= 0 || percentage > 100) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 })
    }

    // Verify user has access to this escrow
    const { data: escrow } = await supabaseAdmin
      .from('escrows')
      .select('buyer_id, seller_id, status')
      .eq('id', params.id)
      .single()

    if (!escrow || (escrow.buyer_id !== session.user.id && escrow.seller_id !== session.user.id)) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    // Don't allow adding milestones to completed/cancelled escrows
    if (escrow.status === 'completed' || escrow.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot add milestones to completed or cancelled escrow' }, { status: 400 })
    }

    // Check total percentage doesn't exceed 100%
    const { data: existingMilestones } = await supabaseAdmin
      .from('escrow_milestones')
      .select('percentage')
      .eq('escrow_id', params.id)

    const totalPercentage = (existingMilestones || []).reduce((sum, m) => sum + parseFloat(m.percentage), 0)

    if (totalPercentage + percentage > 100) {
      return NextResponse.json({
        error: `Total percentage would exceed 100% (current: ${totalPercentage}%, adding: ${percentage}%)`
      }, { status: 400 })
    }

    // Create milestone using database function
    const { data: milestoneId, error } = await supabaseAdmin.rpc('create_escrow_milestone', {
      p_escrow_id: params.id,
      p_title: title,
      p_description: description || null,
      p_percentage: percentage,
      p_sequence_order: sequenceOrder || null
    })

    if (error) {
      console.error('Error creating milestone:', error)
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
    }

    // Fetch created milestone
    const { data: milestone } = await supabaseAdmin
      .from('escrow_milestones')
      .select('*')
      .eq('id', milestoneId)
      .single()

    return NextResponse.json({ milestone }, { status: 201 })
  } catch (error) {
    console.error('Failed to create milestone:', error)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}
