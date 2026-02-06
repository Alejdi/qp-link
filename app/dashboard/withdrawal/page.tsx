'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useWallet } from '@/contexts/WalletContext'

export default function WithdrawalPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { wallet, loading: walletLoading, refreshWallet } = useWallet()
  const [amount, setAmount] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])

  const availableBalance = wallet?.balance || 0
  const frozenBalance = wallet?.frozenBalance || 0
  const minWithdrawal = 1.00
  const maxWithdrawal = Math.min(availableBalance, 50000.00)

  useEffect(() => {
    fetchWithdrawalHistory()
  }, [])

  const fetchWithdrawalHistory = async () => {
    try {
      const res = await fetch('/api/wallet/withdraw')
      if (res.ok) {
        const data = await res.json()
        setWithdrawalHistory(data.withdrawals || [])
      }
    } catch (error) {
      console.error('Failed to fetch withdrawal history:', error)
    }
  }

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const withdrawalAmount = parseFloat(amount)

    // Validation
    if (!amount || withdrawalAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (withdrawalAmount < minWithdrawal) {
      setError(`Minimum withdrawal amount is €${minWithdrawal.toFixed(2)}`)
      return
    }

    if (withdrawalAmount > maxWithdrawal) {
      setError(`Insufficient balance. Maximum withdrawal is €${maxWithdrawal.toFixed(2)}`)
      return
    }

    if (!bankAccount || bankAccount.trim().length === 0) {
      setError('Please enter your bank account number')
      return
    }

    setIsProcessing(true)

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawalAmount,
          destination: bankAccount,
          method: 'bank_transfer',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Withdrawal failed')
      }

      setSuccess(`Withdrawal of €${withdrawalAmount.toFixed(2)} has been requested successfully!`)
      setAmount('')
      setBankAccount('')
      await refreshWallet()
      await fetchWithdrawalHistory()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const setQuickAmount = (value: number) => {
    setAmount(value.toString())
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Withdraw Funds</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Transfer money from your QP Link wallet to your bank account
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`rounded-xl p-6 ${isDark ? 'bg-gradient-to-br from-[#21255B] to-[#1a1e4a] border border-[#2A2A3C]' : 'bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-700'}`}>
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90 mb-1">Available to Withdraw</p>
                <p className="text-3xl font-bold">€{availableBalance.toFixed(2)}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white/20'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </div>
            </div>
          </div>

          {frozenBalance > 0 && (
            <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Frozen in Escrow</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>€{frozenBalance.toFixed(2)}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <svg className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Available after escrow release
              </p>
            </div>
          )}
        </div>

        {/* Withdrawal Form */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <form onSubmit={handleWithdrawal}>
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Withdrawal Amount
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>€</span>
                <input
                  type="number"
                  step="0.01"
                  min={minWithdrawal}
                  max={maxWithdrawal}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-lg font-semibold border transition-colors ${
                    isDark
                      ? 'bg-[#1A1A24] border-[#2A2A3C] text-white placeholder-gray-500 focus:border-[#B8EDFD] focus:ring-1 focus:ring-[#B8EDFD]'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  } outline-none`}
                />
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Minimum: €{minWithdrawal.toFixed(2)} • Maximum: €{maxWithdrawal.toFixed(2)}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="mb-6">
              <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quick Amount</p>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 100, 250].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuickAmount(value)}
                    disabled={value > availableBalance}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      value > availableBalance
                        ? isDark
                          ? 'bg-[#1A1A24] text-gray-600 cursor-not-allowed border border-[#2A2A3C]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDark
                          ? 'bg-[#1A1A24] text-white hover:bg-[#21255B] border border-[#2A2A3C]'
                          : 'bg-gray-50 text-gray-900 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                    }`}
                  >
                    €{value}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Account Input */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Bank Account Number (IBAN)
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="GB29 NWBK 6016 1331 9268 19"
                className={`w-full px-4 py-3 rounded-lg font-mono border transition-colors ${
                  isDark
                    ? 'bg-[#1A1A24] border-[#2A2A3C] text-white placeholder-gray-500 focus:border-[#B8EDFD] focus:ring-1 focus:ring-[#B8EDFD]'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                } outline-none`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Enter your International Bank Account Number (IBAN)
              </p>
            </div>

            {/* Processing Time Info */}
            <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-900/30' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                    Processing Time
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-blue-500' : 'text-blue-700'}`}>
                    Withdrawals are typically processed within 1-3 business days
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-lg font-semibold transition-colors ${
                isProcessing
                  ? isDark
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Withdraw Funds'
              )}
            </button>
          </form>
        </div>

        {/* Recent Withdrawals */}
        <div className={`mt-6 rounded-xl overflow-hidden ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-[#2A2A3C]">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Withdrawals</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Sample withdrawal items */}
              {[
                { id: 1, amount: 100.00, status: 'completed', date: '2024-12-05', account: '****9268' },
                { id: 2, amount: 50.00, status: 'processing', date: '2024-12-08', account: '****9268' },
              ].map((withdrawal) => (
                <div key={withdrawal.id} className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      withdrawal.status === 'completed'
                        ? isDark ? 'bg-green-900/20' : 'bg-green-100'
                        : isDark ? 'bg-yellow-900/20' : 'bg-yellow-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        withdrawal.status === 'completed'
                          ? isDark ? 'text-green-400' : 'text-green-600'
                          : isDark ? 'text-yellow-400' : 'text-yellow-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {withdrawal.status === 'completed' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Withdrawal to {withdrawal.account}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(withdrawal.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      -€{withdrawal.amount.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      withdrawal.status === 'completed'
                        ? isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'
                        : isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {withdrawal.status === 'completed' ? 'Completed' : 'Processing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
