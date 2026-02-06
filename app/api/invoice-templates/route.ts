import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List user's invoice templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error } = await supabaseAdmin
      .from('invoice_templates')
      .select(`
        *,
        line_items:template_line_items(*)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create new invoice template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      description,
      productName,
      productDescription,
      defaultPrice,
      currency,
      paymentTermsDays,
      lateFeePercentage,
      taxPercentage,
      customFields,
      notes,
      footerText,
      logoUrl,
      primaryColor,
      defaultEmailSubject,
      defaultEmailBody,
      sendReminder,
      reminderDaysBefore,
      tags,
      isDefault,
      lineItems
    } = body

    // Validation
    if (!name || !productName) {
      return NextResponse.json({ error: 'Name and product name are required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await supabaseAdmin
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
    }

    // Create template
    const { data: template, error } = await supabaseAdmin
      .from('invoice_templates')
      .insert({
        user_id: session.user.id,
        name,
        description: description || null,
        product_name: productName,
        product_description: productDescription || null,
        default_price: defaultPrice || null,
        currency: currency || 'EUR',
        payment_terms_days: paymentTermsDays || 7,
        late_fee_percentage: lateFeePercentage || 0,
        tax_percentage: taxPercentage || 0,
        custom_fields: customFields || {},
        notes: notes || null,
        footer_text: footerText || null,
        logo_url: logoUrl || null,
        primary_color: primaryColor || '#21255B',
        default_email_subject: defaultEmailSubject || null,
        default_email_body: defaultEmailBody || null,
        send_reminder: sendReminder !== false,
        reminder_days_before: reminderDaysBefore || 3,
        tags: tags || [],
        is_default: isDefault || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    // Create line items if provided
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const lineItemsData = lineItems.map((item: any, index: number) => ({
        template_id: template.id,
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

    // Fetch template with line items
    const { data: fullTemplate } = await supabaseAdmin
      .from('invoice_templates')
      .select(`
        *,
        line_items:template_line_items(*)
      `)
      .eq('id', template.id)
      .single()

    return NextResponse.json({ template: fullTemplate }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
