import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE - Remove a trusted device
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify device ownership and delete
    const { error } = await supabaseAdmin
      .from('trusted_devices')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error removing device:', error)
      return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Device removed successfully'
    })
  } catch (error) {
    console.error('Failed to remove device:', error)
    return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
  }
}
