'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/contexts/ThemeContext'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { data: session } = useSession()

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

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className={`text-[14px] font-medium transition-colors ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>Features</a>
              <a href="#pricing" className={`text-[14px] font-medium transition-colors ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>Pricing</a>
            </nav>

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
              {session ? (
                <Link href="/dashboard">
                  <button className="px-4 py-2 bg-[#21255B] hover:bg-[#1a1e4a] text-white rounded-xl text-[13px] font-semibold transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <button className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${isDark ? 'text-white hover:bg-[#2A2A3C]' : 'text-[#21255B] hover:bg-[#F1F2F3]'}`}>
                      Sign In
                    </button>
                  </Link>
                  <Link href="/signup">
                    <button className="px-4 py-2 bg-[#21255B] hover:bg-[#1a1e4a] text-white rounded-xl text-[13px] font-semibold transition-colors">
                      Get Started
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B8EDFD]/20 text-[#21255B] dark:text-[#B8EDFD] mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className={`text-[13px] font-medium ${isDark ? 'text-[#B8EDFD]' : 'text-[#21255B]'}`}>New: AI-powered analytics now available</span>
            </div>

            <h1 className={`text-[48px] md:text-[56px] font-bold leading-tight mb-6 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
              Create Instant
              <span className="text-[#B8EDFD]"> Payment Links</span>
            </h1>

            <p className={`text-[18px] leading-relaxed mb-10 max-w-2xl mx-auto ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              Turn your products into shareable payment links with images, QR codes, and real-time analytics. Get paid faster with QP Link.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <Link href="/signup">
                <button className="px-8 py-4 bg-[#21255B] hover:bg-[#1a1e4a] text-white rounded-xl text-[15px] font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-[#21255B]/20">
                  Start Free Trial
                </button>
              </Link>
              <a href="#features">
                <button className={`px-8 py-4 rounded-xl text-[15px] font-semibold transition-all hover:-translate-y-0.5 ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-white text-[#21255B] border border-[#E5E7EB] hover:bg-[#F1F2F3]'}`}>
                  Learn More
                </button>
              </a>
            </div>

            {/* Dashboard Preview */}
            <div className={`rounded-2xl p-2 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'} shadow-2xl`}>
              <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
                <div className="flex">
                  {/* Mini Sidebar */}
                  <div className={`w-48 p-4 hidden md:block ${isDark ? 'bg-[#15151D] border-r border-[#2A2A3C]' : 'bg-white border-r border-[#E5E7EB]'}`}>
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-6 h-6 rounded-md bg-[#21255B]"></div>
                      <span className={`text-[13px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>QP Link</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21255B] text-white text-[12px]">
                        <div className="w-4 h-4 rounded bg-white/20"></div>
                        Home
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                        <div className={`w-4 h-4 rounded ${isDark ? 'bg-[#2A2A3C]' : 'bg-[#E5E7EB]'}`}></div>
                        Products
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                        <div className={`w-4 h-4 rounded ${isDark ? 'bg-[#2A2A3C]' : 'bg-[#E5E7EB]'}`}></div>
                        Analytics
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1A1A24]' : 'bg-white border border-[#E5E7EB]'}`}>
                        <p className={`text-[11px] mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Total Revenue</p>
                        <p className={`text-[20px] font-bold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>$12,458.00</p>
                      </div>
                      <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1A1A24]' : 'bg-white border border-[#E5E7EB]'}`}>
                        <p className={`text-[11px] mb-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Active Links</p>
                        <p className={`text-[20px] font-bold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>24</p>
                      </div>
                    </div>

                    {/* Chart Bars */}
                    <div className={`rounded-xl p-4 ${isDark ? 'bg-[#1A1A24]' : 'bg-white border border-[#E5E7EB]'}`}>
                      <div className="h-24 flex items-end gap-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
                          <div key={i} className={`flex-1 rounded-t ${isDark ? 'bg-[#B8EDFD]/40' : 'bg-[#21255B]/30'}`} style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`py-24 ${isDark ? 'bg-[#15151D]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-[36px] font-bold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
              Everything you need to sell online
            </h2>
            <p className={`text-[16px] max-w-2xl mx-auto ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              Simple, powerful tools to create and share payment links in seconds
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
                title: 'Product Images',
                description: 'Upload beautiful product images to make your payment links stand out and convert better.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  </svg>
                ),
                title: 'QR Codes',
                description: 'Auto-generated QR codes for easy sharing in physical locations and print materials.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: 'Real-time Analytics',
                description: 'Track clicks, visitors, devices, and completed purchases with detailed insights.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
                title: 'Short Links',
                description: 'Clean, memorable URLs that are easy to share across social media and messaging.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                ),
                title: 'Stripe Payments',
                description: 'Secure payment processing powered by Stripe with instant checkout experience.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: 'Enterprise Security',
                description: 'Bank-level encryption with secure hosting and compliance with industry standards.'
              },
            ].map((feature, i) => (
              <div key={i} className={`rounded-2xl p-6 transition-all hover:-translate-y-1 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C] hover:border-[#3A3A4C]' : 'bg-[#F8F8F8] border border-[#E5E7EB] hover:border-[#D1D5DB]'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-[#21255B] text-[#B8EDFD]' : 'bg-[#21255B]/10 text-[#21255B]'}`}>
                  {feature.icon}
                </div>
                <h3 className={`text-[16px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>{feature.title}</h3>
                <p className={`text-[14px] leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`py-24 ${isDark ? 'bg-[#0D0D12]' : 'bg-[#F8F8F8]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-[36px] font-bold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
              Simple, transparent pricing
            </h2>
            <p className={`text-[16px] max-w-2xl mx-auto ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              Choose the plan that works best for your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className={`rounded-2xl p-8 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
              <h3 className={`text-[20px] font-bold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Starter</h3>
              <p className={`text-[14px] mb-6 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Perfect for getting started</p>
              <div className="mb-6">
                <span className={`text-[40px] font-bold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>$9</span>
                <span className={`text-[14px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['10 payment links', 'Basic analytics', 'QR codes', 'Email support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-[14px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{item}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-[#F1F2F3] text-[#21255B] hover:bg-[#E5E7EB]'}`}>
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-8 bg-[#21255B] border-2 border-[#B8EDFD] relative transform md:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-[#B8EDFD] text-[#21255B] text-[12px] font-semibold rounded-full">Most Popular</span>
              </div>
              <h3 className="text-[20px] font-bold mb-2 text-white">Pro</h3>
              <p className="text-[14px] mb-6 text-white/70">For growing businesses</p>
              <div className="mb-6">
                <span className="text-[40px] font-bold text-white">$29</span>
                <span className="text-[14px] text-white/70">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited payment links', 'Advanced analytics', 'Custom branding', 'Priority support', 'API access'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#B8EDFD]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[14px] text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 bg-[#B8EDFD] text-[#21255B] rounded-xl text-[14px] font-semibold hover:bg-[#a0e5fc] transition-colors">
                Get Started
              </button>
            </div>

            {/* Custom */}
            <div className={`rounded-2xl p-8 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
              <h3 className={`text-[20px] font-bold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Custom</h3>
              <p className={`text-[14px] mb-6 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>Pay only for what you use</p>
              <div className="mb-6">
                <div className="flex flex-col">
                  <span className={`text-[32px] font-bold leading-tight ${isDark ? 'text-white' : 'text-[#21255B]'}`}>2.9% + €0.30</span>
                  <span className={`text-[14px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>per transaction</span>
                  <span className={`text-[12px] mt-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>No minimum fee</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in Pro', 'Commission-based pricing', 'No monthly commitment', 'Scale as you grow', 'Pay per transaction'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-[14px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{item}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-[#F1F2F3] text-[#21255B] hover:bg-[#E5E7EB]'}`}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-24 ${isDark ? 'bg-[#15151D]' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-[36px] font-bold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
            Ready to get started?
          </h2>
          <p className={`text-[16px] mb-8 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Create your first payment link in under 2 minutes. No credit card required.
          </p>
          <Link href="/signup">
            <button className="px-8 py-4 bg-[#21255B] hover:bg-[#1a1e4a] text-white rounded-xl text-[15px] font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-[#21255B]/20">
              Start Your Free Trial
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${isDark ? 'bg-[#0D0D12] border-t border-[#2A2A3C]' : 'bg-[#F8F8F8] border-t border-[#E5E7EB]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#21255B] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className={`text-[16px] font-semibold ${isDark ? 'text-white' : 'text-[#21255B]'}`}>QP Link</span>
            </div>

            <div className="flex items-center gap-8">
              <Link href="/privacy" className={`text-[13px] transition-colors ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>Privacy</Link>
              <Link href="/terms" className={`text-[13px] transition-colors ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>Terms</Link>
              <Link href="/contact" className={`text-[13px] transition-colors ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#6B7280] hover:text-[#21255B]'}`}>Contact</Link>
            </div>

            <p className={`text-[13px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              &copy; 2025 QP Link. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
