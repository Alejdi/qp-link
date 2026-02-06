import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Create invoice from template
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
    const { customerEmail, customerName, overridePrice, customValues } = body

    // Validation
    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 })
    }

    // Verify template ownership
    const { data: template } = await supabaseAdmin
      .from('invoice_templates')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!template || template.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Use database function to create invoice
    const { data: invoiceId, error } = await supabaseAdmin.rpc('create_invoice_from_template', {
      p_template_id: params.id,
      p_customer_email: customerEmail,
      p_customer_name: customerName || null,
      p_override_price: overridePrice || null,
      p_custom_values: customValues || {}
    })

    if (error) {
      console.error('Error creating invoice from template:', error)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Fetch created invoice
    const { data: invoice } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', invoiceId)
      .single()

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Failed to create invoice from template:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
