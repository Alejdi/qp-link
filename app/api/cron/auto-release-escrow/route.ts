import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { sendEscrowReleasedEmail } from '@/lib/email-service'

// GET - Auto-release escrows that have passed their auto_release_at date
// This should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron attempt with invalid secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log(`[Auto-Release Cron] Running at ${now.toISOString()}`)

    // Find all escrows that should be auto-released
    const { data: escrows, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select(`
        id,
        seller_id,
        buyer_email,
        invoice_id,
        amount,
        net_amount,
        auto_release_at,
        seller_confirmed,
        buyer_confirmed,
        users:seller_id (id, email, name),
        invoice:products (id, name, short_code)
      `)
      .eq('status', 'held')
      .lte('auto_release_at', now.toISOString())
      .order('auto_release_at', { ascending: true })
      .limit(100) // Process max 100 per run

    if (fetchError) {
      console.error('[Auto-Release Cron] Error fetching escrows:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch escrows' }, { status: 500 })
    }

    if (!escrows || escrows.length === 0) {
      console.log('[Auto-Release Cron] No escrows to release')
      return NextResponse.json({
        success: true,
        message: 'No escrows to release',
        processed: 0,
      })
    }

    console.log(`[Auto-Release Cron] Found ${escrows.length} escrows to release`)

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each escrow
    for (const escrow of escrows) {
      try {
        console.log(`[Auto-Release Cron] Processing escrow ${escrow.id}`)

        // Call the release_escrow database function
        const { error: releaseError } = await supabaseAdmin.rpc('release_escrow', {
          p_escrow_id: escrow.id,
          p_actor_type: 'system',
          p_actor_id: null,
        })

        if (releaseError) {
          console.error(`[Auto-Release Cron] Failed to release escrow ${escrow.id}:`, releaseError)
          results.failed++
          results.errors.push(`${escrow.id}: ${releaseError.message}`)
          continue
        }

        // Log the auto-release event
        await supabaseAdmin.from('escrow_events').insert({
          escrow_id: escrow.id,
          event_type: 'auto_released',
          actor_type: 'system',
          details: {
            auto_release_at: escrow.auto_release_at,
            seller_confirmed: escrow.seller_confirmed,
            buyer_confirmed: escrow.buyer_confirmed,
          },
        })

        // Log activity
        await logActivity({
          userId: escrow.seller_id,
          action: 'escrow_auto_released',
          details: {
            escrow_id: escrow.id,
            amount: escrow.amount,
            net_amount: escrow.net_amount,
            auto_release_at: escrow.auto_release_at,
            seller_confirmed: escrow.seller_confirmed,
            buyer_confirmed: escrow.buyer_confirmed,
          },
          page: '/api/cron/auto-release-escrow',
        })

        // Send email notification to seller
        if (escrow.users && escrow.invoice) {
          await sendEscrowReleasedEmail({
            sellerEmail: escrow.users.email,
            sellerName: escrow.users.name || 'Seller',
            invoiceName: escrow.invoice.name,
            netAmount: escrow.net_amount,
            buyerEmail: escrow.buyer_email,
          })
        }

        results.successful++
        console.log(`[Auto-Release Cron] Successfully released escrow ${escrow.id} - €${escrow.net_amount}`)
      } catch (error: any) {
        console.error(`[Auto-Release Cron] Error processing escrow ${escrow.id}:`, error)
        results.failed++
        results.errors.push(`${escrow.id}: ${error.message}`)
      }
    }

    console.log(`[Auto-Release Cron] Completed - ${results.successful} successful, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Auto-release completed',
      processed: escrows.length,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error: any) {
    console.error('[Auto-Release Cron] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Auto-release failed' },
      { status: 500 }
    )
  }
}
