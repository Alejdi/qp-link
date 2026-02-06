'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

export default function VerifyEmailPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Email verified successfully!')
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to verify email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while verifying your email')
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
      <div className={`max-w-md w-full rounded-2xl p-8 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            status === 'verifying' ? (isDark ? 'bg-[#21255B]' : 'bg-blue-100')
            : status === 'success' ? 'bg-green-500/20'
            : 'bg-red-500/20'
          }`}>
            {status === 'verifying' && (
              <svg className={`w-8 h-8 animate-spin ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
          </div>

          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          <p className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
            {message}
          </p>
        </div>

        {/* Status-specific content */}
        {status === 'verifying' && (
          <div className={`text-center ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
            <p className="text-sm">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-900/30' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                Your email has been successfully verified. You can now sign in to your account.
              </p>
            </div>

            <p className={`text-center text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
              Redirecting to login page in 3 seconds...
            </p>

            <Link
              href="/login"
              className={`block w-full py-3 text-center rounded-xl font-semibold transition-colors ${
                isDark
                  ? 'bg-[#21255B] text-white hover:bg-[#2D3270]'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Sign In Now
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                {message === 'Invalid verification link'
                  ? 'The verification link is invalid or has been tampered with.'
                  : message === 'Verification token has expired'
                  ? 'The verification link has expired. Please request a new one.'
                  : message}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/signup"
                className={`block w-full py-3 text-center rounded-xl font-semibold transition-colors ${
                  isDark
                    ? 'bg-[#21255B] text-white hover:bg-[#2D3270]'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Create New Account
              </Link>

              <Link
                href="/login"
                className={`block w-full py-3 text-center rounded-xl font-medium transition-colors ${
                  isDark
                    ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
