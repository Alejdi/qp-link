import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Generate a unique card number (format: XXXX XXXX XXXX)
async function generateUniqueCardNumber(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Generate random 12-digit number in format XXXX XXXX XXXX
    const part1 = Math.floor(1000 + Math.random() * 9000).toString()
    const part2 = Math.floor(1000 + Math.random() * 9000).toString()
    const part3 = Math.floor(1000 + Math.random() * 9000).toString()
    const cardNumber = `${part1} ${part2} ${part3}`

    // Check if it exists in database
    const { data: existing } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('card_number', cardNumber)
      .single()

    if (!existing) {
      return cardNumber
    }

    attempts++
  }

  throw new Error('Failed to generate unique card number')
}

// Generate random 3-digit CVC
function generateCVC(): string {
  return Math.floor(100 + Math.random() * 900).toString()
}

// GET - List user's cards
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching cards:', error)
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }

    return NextResponse.json({
      cards: cards?.map(card => ({
        id: card.id,
        cardNumber: card.card_number,
        holderName: card.holder_name,
        cvc: card.cvc,
        cardType: card.card_type,
        createdAt: card.created_at,
      })) || []
    })
  } catch (error) {
    console.error('Failed to fetch cards:', error)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }
}

// POST - Create a new card
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { holderName, cardType } = body

    if (!holderName) {
      return NextResponse.json({ error: 'Holder name is required' }, { status: 400 })
    }

    // Check card limit based on subscription (for now, hardcode limits)
    const { data: existingCards } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('user_id', session.user.id)

    const cardCount = existingCards?.length || 0

    // Get user subscription tier
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('subscription_tier')
      .eq('id', session.user.id)
      .single()

    const tier = user?.subscription_tier || 'free'
    const limits: Record<string, number> = {
      free: 1,
      starter: 3,
      pro: 5,
      enterprise: 100,
    }

    const limit = limits[tier] || 1

    if (cardCount >= limit) {
      return NextResponse.json(
        { error: `Card limit reached. Upgrade your plan to add more cards.` },
        { status: 400 }
      )
    }

    // Generate unique card number and CVC
    const cardNumber = await generateUniqueCardNumber()
    const cvc = generateCVC()

    // If this is the first card or cardType is 'primary', make it primary
    // and demote any existing primary card
    const finalCardType = cardType || (cardCount === 0 ? 'primary' : 'secondary')

    if (finalCardType === 'primary') {
      // Demote existing primary card
      await supabaseAdmin
        .from('cards')
        .update({ card_type: 'secondary' })
        .eq('user_id', session.user.id)
        .eq('card_type', 'primary')
    }

    // Get or create wallet for user
    let { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: session.user.id })
        .select()
        .single()
      wallet = newWallet
    }

    // Create the card linked to wallet
    const { data: card, error } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: session.user.id,
        wallet_id: wallet?.id,
        card_number: cardNumber,
        holder_name: holderName,
        cvc: cvc,
        card_type: finalCardType,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating card:', error)
      return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
    }

    return NextResponse.json({
      card: {
        id: card.id,
        cardNumber: card.card_number,
        holderName: card.holder_name,
        cvc: card.cvc,
        cardType: card.card_type,
        createdAt: card.created_at,
      }
    })
  } catch (error) {
    console.error('Failed to create card:', error)
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
  }
}

// DELETE - Delete a card
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cardId = searchParams.get('id')

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('id, card_type')
      .eq('id', cardId)
      .eq('user_id', session.user.id)
      .single()

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Delete the card
    const { error } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', cardId)

    if (error) {
      console.error('Error deleting card:', error)
      return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
    }

    // If deleted card was primary, promote the oldest remaining card
    if (card.card_type === 'primary') {
      const { data: remainingCards } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (remainingCards && remainingCards.length > 0) {
        await supabaseAdmin
          .from('cards')
          .update({ card_type: 'primary' })
          .eq('id', remainingCards[0].id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete card:', error)
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
  }
}
