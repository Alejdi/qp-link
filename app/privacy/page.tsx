'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/contexts/ThemeContext'

export default function PrivacyPage() {
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
        <h1 className={`text-[36px] font-bold mb-8 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Privacy Policy</h1>

        <div className={`space-y-8 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>1. Information We Collect</h2>
            <p className="text-[15px] leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This may include your name, email address, payment information, and any other information you choose to provide.
            </p>
            <p className="text-[15px] leading-relaxed">
              We automatically collect certain information when you use our services, including your IP address, device type, browser type, operating system, and usage data.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>2. How We Use Your Information</h2>
            <p className="text-[15px] leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[15px]">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>3. Information Sharing</h2>
            <p className="text-[15px] leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with service providers who assist us in operating our website and conducting our business.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>4. Data Security</h2>
            <p className="text-[15px] leading-relaxed">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>5. Your Rights</h2>
            <p className="text-[15px] leading-relaxed">
              You have the right to access, update, or delete your personal information at any time. You can do this by logging into your account or contacting us directly.
            </p>
          </section>

          <section>
            <h2 className={`text-[20px] font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>6. Contact Us</h2>
            <p className="text-[15px] leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at privacy@qplink.com.
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
