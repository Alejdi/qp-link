import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Convert amount from one currency to another
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, from, to } = body

    // Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    if (!from || typeof from !== 'string') {
      return NextResponse.json({ error: 'Source currency is required' }, { status: 400 })
    }

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Target currency is required' }, { status: 400 })
    }

    // Use database function to convert
    const { data, error } = await supabaseAdmin.rpc('convert_currency', {
      p_amount: amount,
      p_from_currency: from.toUpperCase(),
      p_to_currency: to.toUpperCase()
    })

    if (error) {
      console.error('Conversion error:', error)
      return NextResponse.json({ error: 'Currency conversion failed' }, { status: 500 })
    }

    // Get currency symbols
    const { data: fromCurrency } = await supabaseAdmin
      .from('currencies')
      .select('symbol')
      .eq('code', from.toUpperCase())
      .single()

    const { data: toCurrency } = await supabaseAdmin
      .from('currencies')
      .select('symbol')
      .eq('code', to.toUpperCase())
      .single()

    return NextResponse.json({
      from: {
        amount: amount,
        currency: from.toUpperCase(),
        symbol: fromCurrency?.symbol || ''
      },
      to: {
        amount: parseFloat(data),
        currency: to.toUpperCase(),
        symbol: toCurrency?.symbol || ''
      },
      rate: parseFloat(data) / amount
    })
  } catch (error) {
    console.error('Currency conversion error:', error)
    return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 })
  }
}

// GET - Get exchange rate between two currencies
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Both from and to currencies are required' }, { status: 400 })
    }

    // Get both currencies
    const { data: currencies, error } = await supabaseAdmin
      .from('currencies')
      .select('code, exchange_rate_to_eur, symbol, name')
      .in('code', [from.toUpperCase(), to.toUpperCase()])
      .eq('is_active', true)

    if (error || !currencies || currencies.length !== 2) {
      return NextResponse.json({ error: 'Invalid currency codes' }, { status: 400 })
    }

    const fromCurrency = currencies.find(c => c.code === from.toUpperCase())
    const toCurrency = currencies.find(c => c.code === to.toUpperCase())

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 })
    }

    // Calculate rate: convert to EUR then to target
    const eurAmount = 1 * fromCurrency.exchange_rate_to_eur
    const rate = eurAmount / toCurrency.exchange_rate_to_eur

    return NextResponse.json({
      from: {
        code: fromCurrency.code,
        name: fromCurrency.name,
        symbol: fromCurrency.symbol
      },
      to: {
        code: toCurrency.code,
        name: toCurrency.name,
        symbol: toCurrency.symbol
      },
      rate: parseFloat(rate.toFixed(6)),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json({ error: 'Failed to get exchange rate' }, { status: 500 })
  }
}
