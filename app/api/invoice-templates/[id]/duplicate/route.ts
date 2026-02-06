import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Duplicate template
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
    const { newName } = body

    // Verify template ownership
    const { data: template } = await supabaseAdmin
      .from('invoice_templates')
      .select('user_id, name')
      .eq('id', params.id)
      .single()

    if (!template || template.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const duplicateName = newName || `${template.name} (Copy)`

    // Use database function to duplicate
    const { data: newTemplateId, error } = await supabaseAdmin.rpc('duplicate_template', {
      p_template_id: params.id,
      p_new_name: duplicateName
    })

    if (error) {
      console.error('Error duplicating template:', error)
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 })
    }

    // Fetch duplicated template
    const { data: newTemplate } = await supabaseAdmin
      .from('invoice_templates')
      .select(`
        *,
        line_items:template_line_items(*)
      `)
      .eq('id', newTemplateId)
      .single()

    return NextResponse.json({ template: newTemplate }, { status: 201 })
  } catch (error) {
    console.error('Failed to duplicate template:', error)
    return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 })
  }
}
