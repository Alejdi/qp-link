import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get template details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: template, error } = await supabaseAdmin
      .from('invoice_templates')
      .select(`
        *,
        line_items:template_line_items(*)
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PATCH - Update template
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('invoice_templates')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await supabaseAdmin
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
        .neq('id', params.id)
    }

    // Update template
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.productName !== undefined) updateData.product_name = body.productName
    if (body.productDescription !== undefined) updateData.product_description = body.productDescription
    if (body.defaultPrice !== undefined) updateData.default_price = body.defaultPrice
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.paymentTermsDays !== undefined) updateData.payment_terms_days = body.paymentTermsDays
    if (body.lateFeePercentage !== undefined) updateData.late_fee_percentage = body.lateFeePercentage
    if (body.taxPercentage !== undefined) updateData.tax_percentage = body.taxPercentage
    if (body.customFields !== undefined) updateData.custom_fields = body.customFields
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.footerText !== undefined) updateData.footer_text = body.footerText
    if (body.logoUrl !== undefined) updateData.logo_url = body.logoUrl
    if (body.primaryColor !== undefined) updateData.primary_color = body.primaryColor
    if (body.defaultEmailSubject !== undefined) updateData.default_email_subject = body.defaultEmailSubject
    if (body.defaultEmailBody !== undefined) updateData.default_email_body = body.defaultEmailBody
    if (body.sendReminder !== undefined) updateData.send_reminder = body.sendReminder
    if (body.reminderDaysBefore !== undefined) updateData.reminder_days_before = body.reminderDaysBefore
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.isDefault !== undefined) updateData.is_default = body.isDefault

    const { error } = await supabaseAdmin
      .from('invoice_templates')
      .update(updateData)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    // Update line items if provided
    if (body.lineItems !== undefined && Array.isArray(body.lineItems)) {
      // Delete existing line items
      await supabaseAdmin
        .from('template_line_items')
        .delete()
        .eq('template_id', params.id)

      // Insert new line items
      if (body.lineItems.length > 0) {
        const lineItemsData = body.lineItems.map((item: any, index: number) => ({
          template_id: params.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice,
          unit: item.unit || 'item',
          sort_order: index
        }))

        await supabaseAdmin
          .from('template_line_items')
          .insert(lineItemsData)
      }
    }

    // Fetch updated template
    const { data: updated } = await supabaseAdmin
      .from('invoice_templates')
      .select(`
        *,
        line_items:template_line_items(*)
      `)
      .eq('id', params.id)
      .single()

    return NextResponse.json({ template: updated })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: template } = await supabaseAdmin
      .from('invoice_templates')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!template || template.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Delete template (cascade will delete line items)
    const { error } = await supabaseAdmin
      .from('invoice_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
