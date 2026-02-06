import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH - Update fraud alert status (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { status, resolutionNotes } = body

    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'resolved' || status === 'false_positive') {
      updates.resolved_by = session.user.id
      updates.resolved_at = new Date().toISOString()
      updates.resolution_notes = resolutionNotes
    }

    if (status === 'investigating') {
      updates.assigned_to = session.user.id
    }

    const { error } = await supabaseAdmin
      .from('fraud_alerts')
      .update(updates)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating alert:', error)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Alert updated successfully'
    })
  } catch (error) {
    console.error('Failed to update alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
