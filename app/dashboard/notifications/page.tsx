'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'

interface Notification {
  id: string
  type: 'invoice_accepted' | 'invoice_rejected' | 'withdrawal_success' | 'withdrawal_failed' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  metadata?: {
    amount?: string
    invoiceId?: string
    transactionId?: string
  }
}

export default function NotificationsPage() {
  const { isDark } = useTheme()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'invoice_accepted',
      title: 'Invoice Payment Received',
      message: 'Payment of €250.00 has been received for Invoice #INV-2024-001',
      timestamp: '2 hours ago',
      read: false,
      metadata: {
        amount: '€250.00',
        invoiceId: 'INV-2024-001'
      }
    },
    {
      id: '2',
      type: 'withdrawal_success',
      title: 'Withdrawal Completed',
      message: 'Your withdrawal of €500.00 has been processed successfully',
      timestamp: '5 hours ago',
      read: false,
      metadata: {
        amount: '€500.00',
        transactionId: 'TXN-123456'
      }
    },
    {
      id: '3',
      type: 'invoice_rejected',
      title: 'Invoice Payment Failed',
      message: 'Payment for Invoice #INV-2024-002 was declined',
      timestamp: '1 day ago',
      read: true,
      metadata: {
        invoiceId: 'INV-2024-002'
      }
    },
    {
      id: '4',
      type: 'system',
      title: 'System Maintenance Scheduled',
      message: 'We will be performing system maintenance on December 15th at 2:00 AM UTC',
      timestamp: '2 days ago',
      read: true
    },
    {
      id: '5',
      type: 'withdrawal_failed',
      title: 'Withdrawal Failed',
      message: 'Your withdrawal of €300.00 could not be processed. Please check your bank details.',
      timestamp: '3 days ago',
      read: true,
      metadata: {
        amount: '€300.00'
      }
    }
  ])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'invoice_accepted':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'invoice_rejected':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'withdrawal_success':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'withdrawal_failed':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      case 'system':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Stay updated with your transactions and system alerts
          </p>
        </div>

        {/* Filters and Actions */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? isDark
                      ? 'bg-[#21255B] text-[#B8EDFD]'
                      : 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-[#2A2A3C] text-gray-400 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? isDark
                      ? 'bg-[#21255B] text-[#B8EDFD]'
                      : 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-[#2A2A3C] text-gray-400 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`text-sm font-medium transition-colors ${isDark ? 'text-[#B8EDFD] hover:text-[#a0e5fc]' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-gray-100'}`}>
                <svg className={`w-8 h-8 ${isDark ? 'text-[#B8EDFD]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications about invoices, withdrawals, and system updates will appear here'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 transition-all ${
                  !notification.read
                    ? isDark
                      ? 'bg-[#21255B]/20 border border-[#21255B]'
                      : 'bg-blue-50 border border-blue-200'
                    : isDark
                      ? 'bg-[#1A1A24] border border-[#2A2A3C]'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {notification.timestamp}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-start gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2A2A3C] text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                        title="Mark as read"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
