import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Check transaction for fraud risk
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { transactionId, amount, currency } = body

    if (!amount || !currency) {
      return NextResponse.json({ error: 'Amount and currency required' }, { status: 400 })
    }

    // Get IP and device fingerprint
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Simple device fingerprint (in production, use client-side fingerprinting)
    const deviceFingerprint = Buffer.from(`${userAgent}:${ipAddress}`).toString('base64')

    // Calculate risk score
    const { data: riskData, error: riskError } = await supabaseAdmin.rpc('calculate_transaction_risk', {
      p_user_id: session.user.id,
      p_transaction_id: transactionId,
      p_amount: parseFloat(amount),
      p_currency: currency,
      p_ip_address: ipAddress,
      p_device_fingerprint: deviceFingerprint
    })

    if (riskError) {
      console.error('Error calculating risk:', riskError)
      return NextResponse.json({ error: 'Failed to calculate risk' }, { status: 500 })
    }

    const risk = riskData?.[0] || { risk_score: 0, risk_level: 'low', flags: [] }

    // Store risk score if transaction ID provided
    if (transactionId) {
      const { error: insertError } = await supabaseAdmin
        .from('transaction_risk_scores')
        .insert([{
          transaction_id: transactionId,
          user_id: session.user.id,
          risk_score: risk.risk_score,
          risk_level: risk.risk_level,
          flags: risk.flags,
          is_blocked: risk.risk_level === 'critical'
        }])

      if (insertError) {
        console.error('Error storing risk score:', insertError)
      }

      // Create alert for high risk transactions
      if (risk.risk_level === 'high' || risk.risk_level === 'critical') {
        await supabaseAdmin.from('fraud_alerts').insert([{
          user_id: session.user.id,
          transaction_id: transactionId,
          alert_type: risk.flags?.[0] || 'high_risk',
          severity: risk.risk_level,
          message: `Transaction flagged as ${risk.risk_level} risk with score ${risk.risk_score}`,
          details: { flags: risk.flags, amount, currency }
        }])
      }

      // Update user behavior pattern asynchronously
      supabaseAdmin.rpc('update_user_behavior_pattern', {
        p_user_id: session.user.id
      }).then(() => {
        console.log('User behavior pattern updated')
      }).catch((err) => {
        console.error('Failed to update behavior pattern:', err)
      })
    }

    return NextResponse.json({
      riskScore: risk.risk_score,
      riskLevel: risk.risk_level,
      flags: risk.flags || [],
      isBlocked: risk.risk_level === 'critical',
      message: risk.risk_level === 'critical'
        ? 'Transaction blocked due to high fraud risk'
        : risk.risk_level === 'high'
        ? 'Transaction requires manual review'
        : 'Transaction approved'
    })
  } catch (error) {
    console.error('Failed to check fraud risk:', error)
    return NextResponse.json({ error: 'Failed to check fraud risk' }, { status: 500 })
  }
}
