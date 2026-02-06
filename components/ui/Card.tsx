'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  dark?: boolean
}

export function Card({ children, className = '', hover = false, dark = false }: CardProps) {
  return (
    <div className={`rounded-2xl p-6 transition-all duration-200 ${
      dark
        ? 'bg-[#1A1A24] border border-[#2A2A3C]'
        : 'bg-white border border-[#E5E7EB] dark:bg-[#1A1A24] dark:border-[#2A2A3C]'
    } ${hover ? 'hover:shadow-lg hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-[15px] font-semibold text-[#21255B] dark:text-white ${className}`}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-[13px] text-[#6B7280] dark:text-[#9CA3AF] ${className}`}>
      {children}
    </p>
  )
}
