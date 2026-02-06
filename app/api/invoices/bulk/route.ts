import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Perform bulk actions on invoices
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, invoiceIds } = body

    // Validation
    if (!action || !invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (invoiceIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 invoices at a time' }, { status: 400 })
    }

    // Verify all invoices belong to user
    const { data: invoices } = await supabaseAdmin
      .from('products')
      .select('id, user_id')
      .in('id', invoiceIds)

    if (!invoices || invoices.length !== invoiceIds.length) {
      return NextResponse.json({ error: 'Some invoices not found' }, { status: 404 })
    }

    const unauthorizedInvoices = invoices.filter(inv => inv.user_id !== session.user.id)
    if (unauthorizedInvoices.length > 0) {
      return NextResponse.json({ error: 'Unauthorized access to some invoices' }, { status: 403 })
    }

    let result: any = { success: true, affected: 0 }

    switch (action) {
      case 'delete':
        // Delete multiple invoices
        const { error: deleteError } = await supabaseAdmin
          .from('products')
          .delete()
          .in('id', invoiceIds)

        if (deleteError) {
          console.error('Bulk delete error:', deleteError)
          return NextResponse.json({ error: 'Failed to delete invoices' }, { status: 500 })
        }

        result.affected = invoiceIds.length
        result.message = `Deleted ${invoiceIds.length} invoice(s)`
        break

      case 'activate':
        // Activate multiple invoices
        const { error: activateError } = await supabaseAdmin
          .from('products')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .in('id', invoiceIds)

        if (activateError) {
          console.error('Bulk activate error:', activateError)
          return NextResponse.json({ error: 'Failed to activate invoices' }, { status: 500 })
        }

        result.affected = invoiceIds.length
        result.message = `Activated ${invoiceIds.length} invoice(s)`
        break

      case 'deactivate':
        // Deactivate multiple invoices
        const { error: deactivateError } = await supabaseAdmin
          .from('products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', invoiceIds)

        if (deactivateError) {
          console.error('Bulk deactivate error:', deactivateError)
          return NextResponse.json({ error: 'Failed to deactivate invoices' }, { status: 500 })
        }

        result.affected = invoiceIds.length
        result.message = `Deactivated ${invoiceIds.length} invoice(s)`
        break

      case 'mark_paid':
        // Mark multiple invoices as paid
        const { error: paidError } = await supabaseAdmin
          .from('products')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', invoiceIds)
          .eq('payment_status', 'unpaid')

        if (paidError) {
          console.error('Bulk mark paid error:', paidError)
          return NextResponse.json({ error: 'Failed to mark invoices as paid' }, { status: 500 })
        }

        result.affected = invoiceIds.length
        result.message = `Marked ${invoiceIds.length} invoice(s) as paid`
        break

      case 'mark_unpaid':
        // Mark multiple invoices as unpaid
        const { error: unpaidError } = await supabaseAdmin
          .from('products')
          .update({
            payment_status: 'unpaid',
            paid_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', invoiceIds)

        if (unpaidError) {
          console.error('Bulk mark unpaid error:', unpaidError)
          return NextResponse.json({ error: 'Failed to mark invoices as unpaid' }, { status: 500 })
        }

        result.affected = invoiceIds.length
        result.message = `Marked ${invoiceIds.length} invoice(s) as unpaid`
        break

      case 'export':
        // Export invoices data
        const { data: exportData } = await supabaseAdmin
          .from('products')
          .select('*')
          .in('id', invoiceIds)
          .order('created_at', { ascending: false })

        result.data = exportData
        result.affected = exportData?.length || 0
        result.message = `Exported ${exportData?.length || 0} invoice(s)`
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
