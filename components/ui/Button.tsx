'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'

  const variantStyles = {
    primary: 'bg-[#21255B] hover:bg-[#1a1e4a] text-white shadow-lg shadow-[#21255B]/20 hover:shadow-xl hover:shadow-[#21255B]/30 hover:-translate-y-0.5',
    secondary: 'bg-white dark:bg-[#2A2A3C] hover:bg-[#F1F2F3] dark:hover:bg-[#3A3A4C] text-[#21255B] dark:text-white border border-[#E5E7EB] dark:border-[#2A2A3C] shadow-sm hover:shadow-md',
    accent: 'bg-[#B8EDFD] hover:bg-[#a0e5fc] text-[#21255B] shadow-lg shadow-[#B8EDFD]/30 hover:shadow-xl hover:shadow-[#B8EDFD]/40 hover:-translate-y-0.5',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40',
    ghost: 'hover:bg-[#F1F2F3] dark:hover:bg-[#2A2A3C] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#21255B] dark:hover:text-white',
    outline: 'border-2 border-[#21255B] dark:border-[#B8EDFD] text-[#21255B] dark:text-[#B8EDFD] hover:bg-[#21255B] dark:hover:bg-[#B8EDFD] hover:text-white dark:hover:text-[#21255B]',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-4 py-2 text-[13px]',
    lg: 'px-6 py-3 text-[14px]',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </>
      ) : children}
    </button>
  )
}
