'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function TwoFactorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const email = searchParams.get('email')
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    if (!email) {
      router.push('/login')
    }
  }, [email, router])

  async function handleVerify() {
    if (useBackupCode) {
      if (!backupCode || backupCode.length < 8) {
        setError('Please enter a valid backup code')
        return
      }
    } else {
      if (!code || code.length !== 6) {
        setError('Please enter a valid 6-digit code')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      // Verify 2FA code
      const verifyRes = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: useBackupCode ? backupCode : code,
          isBackupCode: useBackupCode,
          rememberDevice
        })
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid verification code')
        setLoading(false)
        return
      }

      // 2FA verified, now sign in
      const result = await signIn('credentials', {
        email,
        password: verifyData.tempToken, // Use temporary token from verification
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError('Authentication failed. Please try again.')
        setLoading(false)
      } else {
        // Successfully signed in
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h1>
            <p className="text-gray-600">
              Enter the verification code from your authenticator app
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {!useBackupCode ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  maxLength={6}
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberDevice" className="ml-2 block text-sm text-gray-700">
                  Remember this device for 30 days
                </label>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <div className="text-center">
                <button
                  onClick={() => setUseBackupCode(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Use a backup code instead
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Code
                </label>
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter one of your backup codes
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberDevice2"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberDevice2" className="ml-2 block text-sm text-gray-700">
                  Remember this device for 30 days
                </label>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || backupCode.length < 8}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <div className="text-center">
                <button
                  onClick={() => setUseBackupCode(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Use authenticator code instead
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back to login
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Lost access to your authenticator?</p>
          <a href="/support" className="text-blue-600 hover:text-blue-800 underline">
            Contact support
          </a>
        </div>
      </div>
    </div>
  )
}
