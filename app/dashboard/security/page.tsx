'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface TwoFASettings {
  isEnabled: boolean
  backupCodesRemaining: number
}

interface SetupResponse {
  qrCode: string
  secret: string
  backupCodes: string[]
}

interface TrustedDevice {
  id: string
  device_name: string
  last_used: string
  created_at: string
}

export default function SecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [twoFASettings, setTwoFASettings] = useState<TwoFASettings | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [setupData, setSetupData] = useState<SetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadSettings()
      loadTrustedDevices()
    }
  }, [status, router])

  async function loadSettings() {
    try {
      const res = await fetch('/api/auth/2fa/status')
      if (res.ok) {
        const data = await res.json()
        setTwoFASettings(data)
      }
    } catch (err) {
      console.error('Failed to load 2FA settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTrustedDevices() {
    try {
      const res = await fetch('/api/auth/2fa/devices')
      if (res.ok) {
        const data = await res.json()
        setTrustedDevices(data.devices || [])
      }
    } catch (err) {
      console.error('Failed to load trusted devices:', err)
    }
  }

  async function startSetup() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setSetupData(data)
        setShowSetup(true)
      } else {
        setError(data.error || 'Failed to start setup')
      }
    } catch (err) {
      setError('Failed to start setup')
    } finally {
      setActionLoading(false)
    }
  }

  async function enableTwoFA() {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('2FA enabled successfully! Save your backup codes in a safe place.')
        setTwoFASettings({ isEnabled: true, backupCodesRemaining: 10 })
        setVerificationCode('')
        // Keep showing backup codes for user to save
      } else {
        setError(data.error || 'Failed to enable 2FA')
      }
    } catch (err) {
      setError('Failed to enable 2FA')
    } finally {
      setActionLoading(false)
    }
  }

  async function disableTwoFA() {
    if (!disableCode || disableCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('2FA disabled successfully')
        setTwoFASettings({ isEnabled: false, backupCodesRemaining: 0 })
        setDisableCode('')
        setTrustedDevices([])
      } else {
        setError(data.error || 'Failed to disable 2FA')
      }
    } catch (err) {
      setError('Failed to disable 2FA')
    } finally {
      setActionLoading(false)
    }
  }

  async function removeTrustedDevice(deviceId: string) {
    if (!confirm('Remove this trusted device? You will need to verify with 2FA next time you log in from this device.')) {
      return
    }

    try {
      const res = await fetch(`/api/auth/2fa/devices/${deviceId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setTrustedDevices(trustedDevices.filter(d => d.id !== deviceId))
        setSuccess('Device removed successfully')
      } else {
        setError('Failed to remove device')
      }
    } catch (err) {
      setError('Failed to remove device')
    }
  }

  function closeSetup() {
    setShowSetup(false)
    setSetupData(null)
    setVerificationCode('')
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading security settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account security and two-factor authentication</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Two-Factor Authentication Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Two-Factor Authentication</h2>
              <p className="text-gray-600 mb-4">
                Add an extra layer of security to your account by requiring a verification code from your authenticator app.
              </p>

              {twoFASettings?.isEnabled ? (
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">2FA is enabled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">2FA is disabled</span>
                </div>
              )}
            </div>

            {!twoFASettings?.isEnabled && !showSetup && (
              <button
                onClick={startSetup}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Starting...' : 'Enable 2FA'}
              </button>
            )}
          </div>

          {/* Setup Modal */}
          {showSetup && setupData && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Set Up Two-Factor Authentication</h3>

              <div className="space-y-6">
                {/* Step 1: Scan QR Code */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Step 1: Scan QR Code</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="bg-white p-4 inline-block border rounded-lg">
                    <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Or manually enter this key: <code className="bg-gray-100 px-2 py-1 rounded">{setupData.secret}</code>
                  </p>
                </div>

                {/* Step 2: Verify Code */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Step 2: Verify Code</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the 6-digit code from your authenticator app to enable 2FA
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="flex-1 max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={6}
                    />
                    <button
                      onClick={enableTwoFA}
                      disabled={actionLoading || verificationCode.length !== 6}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Verifying...' : 'Enable 2FA'}
                    </button>
                  </div>
                </div>

                {/* Backup Codes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Backup Codes - Save These Now!
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    These codes can be used if you lose access to your authenticator app. Save them in a secure location.
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-sm grid grid-cols-2 gap-2">
                    {setupData.backupCodes.map((code, idx) => (
                      <div key={idx} className="text-gray-700">{code}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const text = setupData.backupCodes.join('\n')
                      navigator.clipboard.writeText(text)
                      setSuccess('Backup codes copied to clipboard!')
                    }}
                    className="mt-3 text-sm text-yellow-800 hover:text-yellow-900 underline"
                  >
                    Copy all codes
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeSetup}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {twoFASettings?.isEnabled ? 'Done' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Disable 2FA */}
          {twoFASettings?.isEnabled && !showSetup && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-red-900">Disable Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter your current verification code to disable 2FA. This will make your account less secure.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  maxLength={6}
                />
                <button
                  onClick={disableTwoFA}
                  disabled={actionLoading || disableCode.length !== 6}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
              {twoFASettings.backupCodesRemaining > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  You have {twoFASettings.backupCodesRemaining} backup code(s) remaining
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trusted Devices */}
        {twoFASettings?.isEnabled && trustedDevices.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trusted Devices</h2>
            <p className="text-gray-600 mb-4">
              Devices where you selected "Remember this device" will not require 2FA verification for 30 days.
            </p>

            <div className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{device.device_name}</div>
                    <div className="text-sm text-gray-500">
                      Last used: {new Date(device.last_used).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Added: {new Date(device.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTrustedDevice(device.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
