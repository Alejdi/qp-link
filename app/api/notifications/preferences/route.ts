import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get notification preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    // Create default preferences if none exist
    if (!prefs) {
      const { data: newPrefs, error } = await supabaseAdmin
        .from('notification_preferences')
        .insert([{ user_id: session.user.id }])
        .select()
        .single()

      if (error) {
        console.error('Error creating preferences:', error)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      prefs = newPrefs
    }

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    console.error('Failed to fetch preferences:', error)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

// PATCH - Update notification preferences
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const { error } = await supabaseAdmin
      .from('notification_preferences')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Failed to update preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
