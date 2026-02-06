'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useCards } from '@/contexts/CardsContext'

export default function QPCardPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { data: session } = useSession()
  const { cards, loading, error, createCard, removeCard } = useCards()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    holderName: '',
    cardType: 'secondary' as 'primary' | 'secondary'
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Subscription tier limits
  const subscriptionTier = 'free' // This will be dynamic later
  const cardLimits = {
    free: 1,
    starter: 3,
    pro: 5,
    custom: Infinity
  }

  const currentLimit = cardLimits[subscriptionTier as keyof typeof cardLimits]
  const canAddMore = cards.length < currentLimit

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (cardToDelete) {
      await removeCard(cardToDelete)
      setShowDeleteConfirm(false)
      setCardToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setCardToDelete(null)
  }

  const openCreateModal = () => {
    setCreateForm({
      holderName: session?.user?.name || '',
      cardType: cards.length === 0 ? 'primary' : 'secondary'
    })
    setCreateError('')
    setShowCreateModal(true)
  }

  const handleCreateCard = async () => {
    if (!createForm.holderName.trim()) {
      setCreateError('Please enter a card holder name')
      return
    }

    setCreating(true)
    setCreateError('')

    const result = await createCard(createForm.holderName.trim(), createForm.cardType)

    if (result) {
      setShowCreateModal(false)
      setCreateForm({ holderName: '', cardType: 'secondary' })
    } else {
      setCreateError(error || 'Failed to create card')
    }

    setCreating(false)
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>QP Card</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your QP Link wallet cards
          </p>
        </div>

        {/* Card Limit Info */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {cards.length} of {currentLimit === Infinity ? '∞' : currentLimit} cards used
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Current plan: <span className="font-semibold capitalize">{subscriptionTier}</span>
                </p>
              </div>
            </div>
            {!canAddMore && currentLimit !== Infinity && (
              <Link href="/pricing">
                <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  Upgrade Plan
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Add New Card Button */}
        {canAddMore && (
          <button
            onClick={openCreateModal}
            className={`w-full mb-6 p-6 rounded-2xl border-2 border-dashed transition-all hover:scale-[1.01] ${isDark ? 'border-[#2A2A3C] hover:border-[#B8EDFD] bg-[#1A1A24]/50 hover:bg-[#1A1A24]' : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50'}`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Add New Card</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Create a new QP Link wallet card
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Cards Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <div key={card.id} className={`rounded-2xl p-6 relative ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200 shadow-sm'}`}>
                {/* Card Display */}
                <div className="mb-4">
                  <div className="min-w-full h-[180px] bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-2xl p-5 text-white relative overflow-hidden flex flex-col justify-between card-shimmer shadow-lg">
                    {/* Card decorations */}
                    <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -mr-14 -mt-14"></div>
                    <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-18 -mb-18"></div>
                    <div className="absolute top-1/2 right-4 w-20 h-20 bg-white/5 rounded-full"></div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-bold tracking-[0.2em]">QP LINK</span>
                        <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <p className="text-[14px] font-semibold mb-0.5">{card.holderName.split(' ')[0]}</p>
                      <p className="text-[15px] font-medium tracking-[0.15em] opacity-90">{card.holderName.split(' ')[1] || ''}</p>
                      <p className="text-[12px] opacity-60 mt-1 tracking-wider">{card.cardNumber}</p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex gap-1">
                        <div className="w-7 h-5 bg-yellow-400/80 rounded-sm flex items-center justify-center">
                          <div className="w-5 h-3 border border-yellow-600/50 rounded-sm"></div>
                        </div>
                        <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] opacity-60 tracking-wide">CVC</p>
                        <p className="text-[12px] font-medium opacity-80">{card.cvc}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Card Number</span>
                    <span className={`text-sm font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.cardNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Card Holder</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.holderName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>CVC</span>
                    <span className={`text-sm font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.cvc}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Type</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${card.cardType === 'primary' ? (isDark ? 'bg-[#21255B] text-[#B8EDFD]' : 'bg-blue-100 text-blue-700') : (isDark ? 'bg-[#2A2A3C] text-gray-400' : 'bg-gray-100 text-gray-700')}`}>
                      {card.cardType === 'primary' ? 'Primary' : 'Secondary'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <button
                    onClick={() => handleDeleteClick(card.id)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className={`rounded-2xl p-12 text-center ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-gray-200'}`}>
              <svg className={`w-8 h-8 ${isDark ? 'text-[#B8EDFD]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No cards yet</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create your first QP Link wallet card to start managing your funds
            </p>
            <button
              onClick={openCreateModal}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              Add Your First Card
            </button>
          </div>
        )}

        {/* Create Card Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)}></div>

            {/* Modal */}
            <div className={`relative max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Create New Card
              </h3>

              {createError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                {/* Card Holder Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Card Holder Name
                  </label>
                  <input
                    type="text"
                    value={createForm.holderName}
                    onChange={(e) => setCreateForm(f => ({ ...f, holderName: e.target.value }))}
                    placeholder="Enter your name"
                    className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-[#1A1A24] border-[#2A2A3C] text-white placeholder-gray-500 focus:border-[#B8EDFD]'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Card Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Card Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, cardType: 'primary' }))}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        createForm.cardType === 'primary'
                          ? isDark
                            ? 'border-[#B8EDFD] bg-[#21255B] text-[#B8EDFD]'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : isDark
                            ? 'border-[#2A2A3C] bg-[#1A1A24] text-gray-400 hover:border-[#3A3A4C]'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, cardType: 'secondary' }))}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        createForm.cardType === 'secondary'
                          ? isDark
                            ? 'border-[#B8EDFD] bg-[#21255B] text-[#B8EDFD]'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : isDark
                            ? 'border-[#2A2A3C] bg-[#1A1A24] text-gray-400 hover:border-[#3A3A4C]'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Secondary
                    </button>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {createForm.cardType === 'primary'
                      ? 'Primary card is used as your default payment method'
                      : 'Secondary cards can be used for specific purposes'}
                  </p>
                </div>

                {/* Info */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    A unique card number and CVC will be automatically generated for your new card.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={creating}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Card'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={cancelDelete}></div>

            {/* Modal */}
            <div className={`relative max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <div className="text-center">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Delete Card
                </h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Are you sure you want to delete this card? This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  >
                    NO
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    YES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
