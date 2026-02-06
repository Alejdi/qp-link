'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface NotificationPreferences {
  email_enabled: boolean
  email_transaction_received: boolean
  email_payment_received: boolean
  email_invoice_paid: boolean
  email_security_alerts: boolean
  sms_enabled: boolean
  sms_phone_number: string | null
  sms_phone_verified: boolean
  sms_security_alerts: boolean
  daily_digest_enabled: boolean
  daily_digest_time: string
}

export default function NotificationSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSMSVerify, setShowSMSVerify] = useState(false)
  const [smsPhoneNumber, setSmsPhoneNumber] = useState('')
  const [smsCode, setSmsCode] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadPreferences()
    }
  }, [status, router])

  async function loadPreferences() {
    try {
      const res = await fetch('/api/notifications/preferences')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  async function savePreferences() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (res.ok) {
        setSuccess('Preferences saved successfully')
      } else {
        setError('Failed to save preferences')
      }
    } catch (err) {
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  async function sendSMSVerification() {
    try {
      const res = await fetch('/api/notifications/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: smsPhoneNumber })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(data.devCode ? `Code sent! (Dev: ${data.devCode})` : 'Code sent to your phone')
      } else {
        setError(data.error || 'Failed to send code')
      }
    } catch (err) {
      setError('Failed to send verification code')
    }
  }

  async function verifySMSCode() {
    try {
      const res = await fetch('/api/notifications/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: smsPhoneNumber, code: smsCode })
      })

      if (res.ok) {
        setSuccess('Phone number verified!')
        setShowSMSVerify(false)
        setSmsCode('')
        loadPreferences()
      } else {
        setError('Invalid verification code')
      }
    } catch (err) {
      setError('Failed to verify code')
    }
  }

  function updatePreference(key: keyof NotificationPreferences, value: any) {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="mt-2 text-gray-600">Manage how you receive notifications</p>
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

        {preferences && (
          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e) => updatePreference('email_enabled', e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable all</span>
                </label>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'email_transaction_received', label: 'Transaction received' },
                  { key: 'email_payment_received', label: 'Payment received' },
                  { key: 'email_invoice_paid', label: 'Invoice paid' },
                  { key: 'email_security_alerts', label: 'Security alerts' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences[item.key as keyof NotificationPreferences] as boolean}
                      onChange={(e) => updatePreference(item.key as keyof NotificationPreferences, e.target.checked)}
                      disabled={!preferences.email_enabled}
                      className="h-4 w-4 text-blue-600 rounded disabled:opacity-50"
                    />
                    <span className="ml-3 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">SMS Notifications</h2>
              {preferences.sms_phone_verified ? (
                <div>
                  <p className="text-sm text-green-600 mb-4">Verified: {preferences.sms_phone_number}</p>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.sms_security_alerts}
                      onChange={(e) => updatePreference('sms_security_alerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">Security alerts via SMS</span>
                  </label>
                </div>
              ) : (
                <button
                  onClick={() => setShowSMSVerify(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Verify Phone Number
                </button>
              )}
            </div>

            {/* Digest Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Digest</h2>
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.daily_digest_enabled}
                    onChange={(e) => updatePreference('daily_digest_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">Receive daily summary email</span>
                </label>
                <input
                  type="time"
                  value={preferences.daily_digest_time}
                  onChange={(e) => updatePreference('daily_digest_time', e.target.value)}
                  disabled={!preferences.daily_digest_enabled}
                  className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={savePreferences}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* SMS Verification Modal */}
        {showSMSVerify && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Verify Phone Number</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={smsPhoneNumber}
                    onChange={(e) => setSmsPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                {smsCode ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      placeholder="000000"
                      className="w-full px-3 py-2 border rounded-lg"
                      maxLength={6}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex gap-3 mt-6">
                {!smsCode ? (
                  <button
                    onClick={sendSMSVerification}
                    disabled={!smsPhoneNumber}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send Code
                  </button>
                ) : (
                  <button
                    onClick={verifySMSCode}
                    disabled={smsCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Verify
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSMSVerify(false)
                    setSmsPhoneNumber('')
                    setSmsCode('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
