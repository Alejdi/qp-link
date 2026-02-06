'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const registered = searchParams.get('registered')
  const registeredEmail = searchParams.get('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // First check if user has 2FA enabled
      const twoFACheck = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const twoFAData = await twoFACheck.json()

      // If 2FA is required and device is not trusted, verify credentials first then redirect to 2FA
      if (twoFAData.requires2FA && !twoFAData.deviceTrusted) {
        // Verify credentials but don't complete login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          // Handle credential errors
          if (result.error.includes('verify your email')) {
            setError('Please verify your email address before signing in. Check your inbox for the verification link.')
          } else if (result.error.includes('suspended')) {
            setError('Your account has been suspended. Please contact support.')
          } else {
            setError('Invalid email or password')
          }
          setIsLoading(false)
          return
        }

        // Credentials are valid, redirect to 2FA page
        router.push(`/login/2fa?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`)
        return
      }

      // No 2FA or device is trusted, proceed with normal login
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Check if error is about email verification
        if (result.error.includes('verify your email')) {
          setError('Please verify your email address before signing in. Check your inbox for the verification link.')
        } else if (result.error.includes('suspended')) {
          setError('Your account has been suspended. Please contact support.')
        } else {
          setError('Invalid email or password')
        }
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  async function handleResendVerification() {
    if (!registeredEmail) return

    setResendingEmail(true)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail })
      })

      if (response.ok) {
        setResendSuccess(true)
      } else {
        throw new Error('Failed to resend')
      }
    } catch (error) {
      setError('Failed to resend verification email')
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D12] px-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Glassmorphism card */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/logo.png" alt="QP Link" width="48" height="48" className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-[#9CA3AF]">Sign in to your account</p>
          </div>

          {/* Registration Success Notice */}
          {registered && registeredEmail && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-green-400 font-semibold mb-1">Account Created Successfully!</h3>
                  <p className="text-green-300/80 text-sm mb-3">
                    We sent a verification email to <span className="font-medium text-green-300">{registeredEmail}</span>
                  </p>
                  <p className="text-green-300/70 text-xs mb-3">
                    Please check your inbox and click the verification link before signing in. The link will expire in 24 hours.
                  </p>
                  {resendSuccess ? (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-xs text-green-300">
                      Verification email resent successfully! Check your inbox.
                    </div>
                  ) : (
                    <button
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      className="text-xs text-green-300 hover:text-green-200 underline disabled:opacity-50"
                    >
                      {resendingEmail ? 'Resending...' : "Didn't receive the email? Resend"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#21255B]/20"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-[#9CA3AF]">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-[#9CA3AF]">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[#B8EDFD] hover:text-white font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
