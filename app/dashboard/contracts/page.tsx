'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

interface Contract {
  id: string
  title: string
  type: 'freelance' | 'service' | 'nda' | 'employment'
  parties: string[]
  status: 'draft' | 'pending_signature' | 'fully_signed' | 'expired'
  createdDate: string
  signedDate?: string
  shortLink: string
}

export default function ContractsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [contracts] = useState<Contract[]>([
    {
      id: '1',
      title: 'Web Development Agreement',
      type: 'freelance',
      parties: ['John Doe', 'Acme Corp'],
      status: 'fully_signed',
      createdDate: '2024-11-15',
      signedDate: '2024-11-16',
      shortLink: 'qpl.ink/abc123'
    },
    {
      id: '2',
      title: 'Non-Disclosure Agreement',
      type: 'nda',
      parties: ['Jane Smith', 'TechStart Inc'],
      status: 'pending_signature',
      createdDate: '2024-12-01',
      shortLink: 'qpl.ink/xyz789'
    },
    {
      id: '3',
      title: 'Consulting Services Contract',
      type: 'service',
      parties: ['Robert Johnson'],
      status: 'draft',
      createdDate: '2024-12-05',
      shortLink: 'qpl.ink/draft01'
    }
  ])

  const getStatusBadge = (status: Contract['status']) => {
    const statusConfig = {
      draft: {
        text: 'Draft',
        class: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
      },
      pending_signature: {
        text: 'Pending Signature',
        class: isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
      },
      fully_signed: {
        text: 'Fully Signed',
        class: isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'
      },
      expired: {
        text: 'Expired',
        class: isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'
      }
    }
    return statusConfig[status]
  }

  const getTypeIcon = (type: Contract['type']) => {
    const icons = {
      freelance: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      service: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      nda: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      employment: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
    return icons[type]
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Contracts</h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create, manage, and sign professional contracts
            </p>
          </div>
          <Link href="/dashboard/contracts/create">
            <button className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Contract
            </button>
          </Link>
        </div>

        {/* Contract Templates */}
        <div className={`rounded-xl p-6 mb-8 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { type: 'freelance', name: 'Freelance Contract', desc: 'For independent contractors' },
              { type: 'service', name: 'Service Agreement', desc: 'For professional services' },
              { type: 'nda', name: 'NDA', desc: 'Non-disclosure agreement' },
              { type: 'employment', name: 'Employment Contract', desc: 'For hiring employees' }
            ].map((template) => (
              <Link key={template.type} href={`/dashboard/contracts/create?template=${template.type}`}>
                <div className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${isDark ? 'bg-[#0D0D12] border-[#2A2A3C] hover:border-[#B8EDFD]' : 'bg-gray-50 border-gray-200 hover:border-blue-400'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-[#2A2A3C] text-[#B8EDFD]' : 'bg-blue-100 text-blue-600'}`}>
                    {getTypeIcon(template.type as Contract['type'])}
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{template.name}</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>{template.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#2A2A3C]' : 'bg-blue-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Total</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{contracts.length}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-900/20' : 'bg-green-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Signed</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {contracts.filter(c => c.status === 'fully_signed').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Pending</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {contracts.filter(c => c.status === 'pending_signature').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Drafts</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {contracts.filter(c => c.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-[#2A2A3C]">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>All Contracts</h2>
          </div>

          {contracts.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-[#2A2A3C]' : 'bg-gray-100'}`}>
                <svg className={`w-8 h-8 ${isDark ? 'text-[#B8EDFD]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No contracts yet</h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
                Create your first professional contract using our templates
              </p>
              <Link href="/dashboard/contracts/create">
                <button className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  Create Contract
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-[#0D0D12]' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Contract</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Type</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Parties</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Status</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Created</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#2A2A3C]">
                  {contracts.map((contract) => {
                    const statusBadge = getStatusBadge(contract.status)
                    return (
                      <tr key={contract.id} className={`${isDark ? 'hover:bg-[#0D0D12]' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-6 py-4">
                          <div>
                            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{contract.title}</p>
                            <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>{contract.shortLink}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
                              {getTypeIcon(contract.type)}
                            </div>
                            <span className={`text-sm capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{contract.type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {contract.parties.join(', ')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
                          {new Date(contract.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/contracts/${contract.id}`}>
                              <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF] hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`} title="View">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </Link>
                            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-[#9CA3AF] hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`} title="Share">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
