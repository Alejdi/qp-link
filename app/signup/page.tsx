'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

type Step = 'account' | 'phone' | 'verify' | 'identity'

export default function SignupPage() {
  const router = useRouter()
  const fileInputFrontRef = useRef<HTMLInputElement>(null)
  const fileInputBackRef = useRef<HTMLInputElement>(null)

  // Current step
  const [step, setStep] = useState<Step>('account')

  // Account details
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Phone verification
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+355')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // ID Card uploads
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null)
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null)

  // General state
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const countryCodes = [
    { code: '+355', country: 'AL', flag: '🇦🇱' },
    { code: '+1', country: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+49', country: 'DE', flag: '🇩🇪' },
    { code: '+33', country: 'FR', flag: '🇫🇷' },
    { code: '+39', country: 'IT', flag: '🇮🇹' },
    { code: '+34', country: 'ES', flag: '🇪🇸' },
    { code: '+31', country: 'NL', flag: '🇳🇱' },
    { code: '+41', country: 'CH', flag: '🇨🇭' },
    { code: '+43', country: 'AT', flag: '🇦🇹' },
    { code: '+32', country: 'BE', flag: '🇧🇪' },
    { code: '+383', country: 'XK', flag: '🇽🇰' },
    { code: '+381', country: 'RS', flag: '🇷🇸' },
    { code: '+389', country: 'MK', flag: '🇲🇰' },
    { code: '+382', country: 'ME', flag: '🇲🇪' },
    { code: '+387', country: 'BA', flag: '🇧🇦' },
    { code: '+385', country: 'HR', flag: '🇭🇷' },
    { code: '+386', country: 'SI', flag: '🇸🇮' },
  ]

  // Step 1: Account Details
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Move to phone step
    setStep('phone')
  }

  // Step 2: Send OTP via WhatsApp
  async function handleSendOtp() {
    setError('')
    setIsLoading(true)

    try {
      const fullPhone = countryCode + phoneNumber.replace(/^0+/, '')

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      setOtpSent(true)
      setStep('verify')
      startResendTimer()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  function startResendTimer() {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Handle OTP input
  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) return // Only allow single digit

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Step 3: Verify OTP
  async function handleVerifyOtp() {
    setError('')
    setIsLoading(true)

    try {
      const otpCode = otp.join('')
      if (otpCode.length !== 6) {
        throw new Error('Please enter the complete 6-digit code')
      }

      const fullPhone = countryCode + phoneNumber.replace(/^0+/, '')

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, otp: otpCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      // Move to identity verification step
      setStep('identity')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle ID card file selection
  function handleIdFrontSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setIdFront(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setIdFrontPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleIdBackSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setIdBack(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setIdBackPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Step 4: Complete signup with ID verification
  async function handleCompleteSignup() {
    setError('')
    setIsLoading(true)

    try {
      if (!idFront || !idBack) {
        throw new Error('Please upload both front and back of your ID card')
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('phoneNumber', countryCode + phoneNumber.replace(/^0+/, ''))
      formData.append('idFront', idFront)
      formData.append('idBack', idBack)

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Redirect to login with email verification message
      router.push(`/login?registered=true&email=${encodeURIComponent(email)}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Google signup (simplified flow)
  async function handleGoogleSignUp() {
    setError('')
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      setError('Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  // Progress indicator
  const steps = [
    { id: 'account', label: 'Account' },
    { id: 'phone', label: 'Phone' },
    { id: 'verify', label: 'Verify' },
    { id: 'identity', label: 'Identity' },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === step)

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D12] px-4 py-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Glassmorphism card */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img src="/logo.png" alt="QP Link" width="48" height="48" className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-[#9CA3AF]">
              {step === 'account' && 'Enter your details to get started'}
              {step === 'phone' && 'Verify your phone number'}
              {step === 'verify' && 'Enter the verification code'}
              {step === 'identity' && 'Upload your ID for verification'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    index <= currentStepIndex
                      ? 'bg-[#B8EDFD] text-[#21255B]'
                      : 'bg-white/10 text-[#9CA3AF]'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${index < currentStepIndex ? 'bg-[#B8EDFD]' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Account Details */}
          {step === 'account' && (
            <>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email</label>
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
                  <label className="block text-sm font-medium text-white mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#21255B]/20"
                >
                  Continue
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

              {/* Google Sign Up Button */}
              <button
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>
            </>
          )}

          {/* Step 2: Phone Number */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code} className="bg-[#1A1A24]">
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="69 123 4567"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  We'll send a verification code to your WhatsApp
                </p>
              </div>

              {/* WhatsApp Icon */}
              <div className="flex items-center justify-center gap-2 py-4">
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-[#9CA3AF] text-sm">Verification via WhatsApp</span>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={isLoading || !phoneNumber}
                className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#21255B]/20"
              >
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </button>

              <button
                onClick={() => setStep('account')}
                className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-[#9CA3AF] text-sm">
                  We sent a code to <span className="text-white font-medium">{countryCode} {phoneNumber}</span>
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#B8EDFD] focus:border-transparent transition-all"
                  />
                ))}
              </div>

              {/* Resend Timer */}
              <div className="text-center mb-4">
                {resendTimer > 0 ? (
                  <p className="text-[#9CA3AF] text-sm">
                    Resend code in <span className="text-white font-medium">{resendTimer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-[#B8EDFD] hover:text-white text-sm font-medium transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.some(d => !d)}
                className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#21255B]/20"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
              >
                Change Number
              </button>
            </div>
          )}

          {/* Step 4: ID Verification */}
          {step === 'identity' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-[#9CA3AF] text-sm">
                  Please upload clear photos of your ID card
                </p>
              </div>

              {/* ID Front */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">ID Card - Front</label>
                <input
                  ref={fileInputFrontRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIdFrontSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputFrontRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                    idFrontPreview
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/20 hover:border-white/40 bg-white/5'
                  }`}
                >
                  {idFrontPreview ? (
                    <div className="relative">
                      <img
                        src={idFrontPreview}
                        alt="ID Front"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 mx-auto text-[#9CA3AF] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zM7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" />
                      </svg>
                      <p className="text-sm text-[#9CA3AF]">Click to upload front side</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Back */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">ID Card - Back</label>
                <input
                  ref={fileInputBackRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIdBackSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputBackRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                    idBackPreview
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/20 hover:border-white/40 bg-white/5'
                  }`}
                >
                  {idBackPreview ? (
                    <div className="relative">
                      <img
                        src={idBackPreview}
                        alt="ID Back"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 mx-auto text-[#9CA3AF] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zM7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" />
                      </svg>
                      <p className="text-sm text-[#9CA3AF]">Click to upload back side</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#9CA3AF] text-center">
                Your ID will be securely stored and used only for verification purposes
              </p>

              <button
                onClick={handleCompleteSignup}
                disabled={isLoading || !idFront || !idBack}
                className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#21255B]/20"
              >
                {isLoading ? 'Creating account...' : 'Complete Sign Up'}
              </button>
            </div>
          )}

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-[#9CA3AF]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#B8EDFD] hover:text-white font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
