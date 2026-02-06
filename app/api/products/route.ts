import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ products: [] })
    }

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ products: [] })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ products: [] })
  }
}
