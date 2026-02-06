import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Perform bulk actions on payment links
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, linkIds } = body

    // Validation
    if (!action || !linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (linkIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 links at a time' }, { status: 400 })
    }

    // Verify all links belong to user
    const { data: links } = await supabaseAdmin
      .from('payment_links')
      .select('id, user_id')
      .in('id', linkIds)

    if (!links || links.length !== linkIds.length) {
      return NextResponse.json({ error: 'Some links not found' }, { status: 404 })
    }

    const unauthorizedLinks = links.filter(link => link.user_id !== session.user.id)
    if (unauthorizedLinks.length > 0) {
      return NextResponse.json({ error: 'Unauthorized access to some links' }, { status: 403 })
    }

    let result: any = { success: true, affected: 0 }

    switch (action) {
      case 'delete':
        const { error: deleteError } = await supabaseAdmin
          .from('payment_links')
          .delete()
          .in('id', linkIds)

        if (deleteError) {
          console.error('Bulk delete error:', deleteError)
          return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 })
        }

        result.affected = linkIds.length
        result.message = `Deleted ${linkIds.length} link(s)`
        break

      case 'activate':
        const { error: activateError } = await supabaseAdmin
          .from('payment_links')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .in('id', linkIds)

        if (activateError) {
          console.error('Bulk activate error:', activateError)
          return NextResponse.json({ error: 'Failed to activate links' }, { status: 500 })
        }

        result.affected = linkIds.length
        result.message = `Activated ${linkIds.length} link(s)`
        break

      case 'deactivate':
        const { error: deactivateError } = await supabaseAdmin
          .from('payment_links')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', linkIds)

        if (deactivateError) {
          console.error('Bulk deactivate error:', deactivateError)
          return NextResponse.json({ error: 'Failed to deactivate links' }, { status: 500 })
        }

        result.affected = linkIds.length
        result.message = `Deactivated ${linkIds.length} link(s)`
        break

      case 'reset_usage':
        const { error: resetError } = await supabaseAdmin
          .from('payment_links')
          .update({ uses_count: 0, updated_at: new Date().toISOString() })
          .in('id', linkIds)

        if (resetError) {
          console.error('Bulk reset error:', resetError)
          return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
        }

        result.affected = linkIds.length
        result.message = `Reset usage for ${linkIds.length} link(s)`
        break

      case 'export':
        const { data: exportData } = await supabaseAdmin
          .from('payment_links')
          .select('*')
          .in('id', linkIds)
          .order('created_at', { ascending: false })

        result.data = exportData
        result.affected = exportData?.length || 0
        result.message = `Exported ${exportData?.length || 0} link(s)`
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 })
  }
}
