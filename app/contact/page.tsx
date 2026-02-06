'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ContactPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

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
        <h1 className={`text-[36px] font-bold mb-4 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Contact Us</h1>
        <p className={`text-[16px] mb-12 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          Have questions or need help? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
        </p>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className={`text-[16px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Email</h3>
              <p className={`text-[15px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>support@qplink.com</p>
            </div>

            <div>
              <h3 className={`text-[16px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Office</h3>
              <p className={`text-[15px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                123 Payment Street<br />
                San Francisco, CA 94102<br />
                United States
              </p>
            </div>

            <div>
              <h3 className={`text-[16px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Hours</h3>
              <p className={`text-[15px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                Monday - Friday<br />
                9:00 AM - 6:00 PM PST
              </p>
            </div>

            <div>
              <h3 className={`text-[16px] font-semibold mb-3 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Follow Us</h3>
              <div className="flex gap-3">
                <a href="#" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#2A2A3C] hover:bg-[#3A3A4C] text-[#9CA3AF]' : 'bg-[#F1F2F3] hover:bg-[#E5E7EB] text-[#6B7280]'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#2A2A3C] hover:bg-[#3A3A4C] text-[#9CA3AF]' : 'bg-[#F1F2F3] hover:bg-[#E5E7EB] text-[#6B7280]'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            {submitted ? (
              <div className={`p-8 rounded-2xl text-center ${isDark ? 'bg-[#15151D] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
                <div className="w-16 h-16 rounded-full bg-[#21255B] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className={`text-[20px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>Message Sent!</h3>
                <p className={`text-[15px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={`p-8 rounded-2xl ${isDark ? 'bg-[#15151D] border border-[#2A2A3C]' : 'bg-white border border-[#E5E7EB]'}`}>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={`block text-[14px] font-medium mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl text-[15px] transition-colors outline-none ${
                        isDark
                          ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white placeholder-[#6B7280] focus:border-[#21255B]'
                          : 'bg-[#F8F8F8] border border-[#E5E7EB] text-[#21255B] placeholder-[#9CA3AF] focus:border-[#21255B]'
                      }`}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className={`block text-[14px] font-medium mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl text-[15px] transition-colors outline-none ${
                        isDark
                          ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white placeholder-[#6B7280] focus:border-[#21255B]'
                          : 'bg-[#F8F8F8] border border-[#E5E7EB] text-[#21255B] placeholder-[#9CA3AF] focus:border-[#21255B]'
                      }`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className={`block text-[14px] font-medium mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl text-[15px] transition-colors outline-none ${
                      isDark
                        ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white focus:border-[#21255B]'
                        : 'bg-[#F8F8F8] border border-[#E5E7EB] text-[#21255B] focus:border-[#21255B]'
                    }`}
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className={`block text-[14px] font-medium mb-2 ${isDark ? 'text-white' : 'text-[#21255B]'}`}>
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl text-[15px] transition-colors outline-none resize-none ${
                      isDark
                        ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white placeholder-[#6B7280] focus:border-[#21255B]'
                        : 'bg-[#F8F8F8] border border-[#E5E7EB] text-[#21255B] placeholder-[#9CA3AF] focus:border-[#21255B]'
                    }`}
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-xl bg-[#21255B] text-white text-[15px] font-medium transition-all hover:bg-[#2D3270] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
