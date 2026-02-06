'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/contexts/ThemeContext'

export default function TermsPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-[#15151D] border-b border-[#2A2A3C]' : 'bg-white border-b border-[#E5E7EB]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="QP Link" width={32} height={32} className="object-contain" />
              <span className={`text-[18px] font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#21255B]'}`}>QP Link</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF]' : 'hover:bg-[#F1F2F3] text-[#6B7280]'}`}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              <Link href="/">
                <button className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${isDark ? 'text-white hover:bg-[#2A2A3C]' : 'text-[#21255B] hover:bg-[#F1F2F3]'}`}>
                  Back to Home
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className={`text-[36px] font-bold mb-8 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Terms of Service</h1>

        <div className={`space-y-8 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>1. Acceptance of Terms</h2>
            <p className="text-[15px] leading-relaxed">
              By accessing or using QP Link services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>2. Description of Service</h2>
            <p className="text-[15px] leading-relaxed">
              QP Link provides a platform for creating and managing payment links, including features such as product image uploads, QR code generation, analytics tracking, and Stripe payment integration.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>3. User Accounts</h2>
            <p className="text-[15px] leading-relaxed mb-4">
              To use certain features of our service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[15px]">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>4. Payment Terms</h2>
            <p className="text-[15px] leading-relaxed">
              Subscription fees are billed in advance on a monthly basis. All payments are processed through Stripe and are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>5. Prohibited Activities</h2>
            <p className="text-[15px] leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[15px]">
              <li>Use the service for any illegal purpose</li>
              <li>Sell counterfeit or illegal products</li>
              <li>Violate any intellectual property rights</li>
              <li>Transmit malware or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>6. Intellectual Property</h2>
            <p className="text-[15px] leading-relaxed">
              The QP Link service, including all content, features, and functionality, is owned by QP Link and is protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>7. Limitation of Liability</h2>
            <p className="text-[15px] leading-relaxed">
              QP Link shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>8. Termination</h2>
            <p className="text-[15px] leading-relaxed">
              We may terminate or suspend your account at any time for any reason, including violation of these terms. Upon termination, your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>9. Changes to Terms</h2>
            <p className="text-[15px] leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>10. Contact</h2>
            <p className="text-[15px] leading-relaxed">
              If you have any questions about these Terms, please contact us at legal@qplink.com.
            </p>
          </section>

          <p className={`text-[14px] pt-8 border-t ${isDark ? 'border-[#2A2A3C]' : 'border-[#E5E7EB]'}`}>
            Last updated: January 2025
          </p>
        </div>
      </main>
    </div>
  )
}
