'use client'

interface SkeletonLoaderProps {
  className?: string
}

export function SkeletonLoader({ className = '' }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gradient-to-r from-[#1A1A24] via-[#21255B]/20 to-[#1A1A24] bg-[length:200%_100%] animate-shimmer h-full w-full rounded-xl"></div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Total Balance Card Skeleton */}
        <div className="rounded-2xl p-4 sm:p-6 bg-[#1A1A24] border border-[#2A2A3C]">
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-[#2A2A3C] rounded mb-2"></div>
            <div className="h-10 w-48 bg-[#2A2A3C] rounded mb-6"></div>
            <div className="flex gap-4">
              <div className="h-32 flex-1 bg-[#2A2A3C] rounded-xl"></div>
              <div className="h-32 flex-1 bg-[#2A2A3C] rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Recent Withdrawals Skeleton */}
        <div className="rounded-2xl p-4 sm:p-6 bg-[#1A1A24] border border-[#2A2A3C]">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-36 bg-[#2A2A3C] rounded"></div>
            <div className="h-16 bg-[#2A2A3C] rounded-xl"></div>
            <div className="h-16 bg-[#2A2A3C] rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Statistics Skeleton */}
        <div className="rounded-2xl p-4 sm:p-6 bg-[#1A1A24] border border-[#2A2A3C]">
          <div className="animate-pulse">
            <div className="h-5 w-24 bg-[#2A2A3C] rounded mb-4"></div>
            <div className="h-8 w-32 bg-[#2A2A3C] rounded mb-4"></div>
            <div className="h-32 bg-[#2A2A3C] rounded-xl mb-4"></div>
            <div className="h-16 bg-[#2A2A3C] rounded"></div>
          </div>
        </div>

        {/* Contracts Skeleton */}
        <div className="rounded-2xl p-4 sm:p-6 bg-[#1A1A24] border border-[#2A2A3C]">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-24 bg-[#2A2A3C] rounded"></div>
            <div className="h-12 bg-[#2A2A3C] rounded-xl"></div>
            <div className="h-12 bg-[#2A2A3C] rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
