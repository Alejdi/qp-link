'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface QPCard {
  id: string
  cardNumber: string
  holderName: string
  cvc: string
  cardType: 'primary' | 'secondary'
}

interface CardsContextType {
  cards: QPCard[]
  loading: boolean
  error: string | null
  fetchCards: () => Promise<void>
  createCard: (holderName: string, cardType: 'primary' | 'secondary') => Promise<QPCard | null>
  removeCard: (id: string) => Promise<boolean>
  addCard: (card: QPCard) => void
  updateCard: (id: string, card: Partial<QPCard>) => void
}

const CardsContext = createContext<CardsContextType | undefined>(undefined)

export function CardsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [cards, setCards] = useState<QPCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch cards from database
  const fetchCards = useCallback(async () => {
    if (!session?.user?.id) {
      setCards([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/cards')

      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to fetch cards')
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err)
      setError('Failed to fetch cards')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Create a new card
  const createCard = async (holderName: string, cardType: 'primary' | 'secondary'): Promise<QPCard | null> => {
    try {
      setError(null)
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderName, cardType }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create card')
        return null
      }

      // If new card is primary, update existing cards in state
      if (cardType === 'primary') {
        setCards(prev => prev.map(c => ({ ...c, cardType: 'secondary' as const })))
      }

      // Add new card to state
      setCards(prev => [...prev, data.card])
      return data.card
    } catch (err) {
      console.error('Failed to create card:', err)
      setError('Failed to create card')
      return null
    }
  }

  // Remove a card
  const removeCard = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const res = await fetch(`/api/cards?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete card')
        return false
      }

      // Remove from state
      setCards(prev => {
        const deletedCard = prev.find(c => c.id === id)
        const remaining = prev.filter(c => c.id !== id)

        // If deleted card was primary and there are remaining cards, make first one primary
        if (deletedCard?.cardType === 'primary' && remaining.length > 0) {
          remaining[0] = { ...remaining[0], cardType: 'primary' }
        }

        return remaining
      })
      return true
    } catch (err) {
      console.error('Failed to delete card:', err)
      setError('Failed to delete card')
      return false
    }
  }

  // Legacy methods for compatibility
  const addCard = (card: QPCard) => {
    setCards(prev => [...prev, card])
  }

  const updateCard = (id: string, updatedCard: Partial<QPCard>) => {
    setCards(prev => prev.map(card =>
      card.id === id ? { ...card, ...updatedCard } : card
    ))
  }

  // Fetch cards when session is ready
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCards()
    } else if (status === 'unauthenticated') {
      setCards([])
      setLoading(false)
    }
  }, [status, fetchCards])

  return (
    <CardsContext.Provider value={{
      cards,
      loading,
      error,
      fetchCards,
      createCard,
      removeCard,
      addCard,
      updateCard
    }}>
      {children}
    </CardsContext.Provider>
  )
}

export function useCards() {
  const context = useContext(CardsContext)
  if (context === undefined) {
    throw new Error('useCards must be used within a CardsProvider')
  }
  return context
}
