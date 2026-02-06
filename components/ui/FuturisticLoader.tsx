'use client'

interface FuturisticLoaderProps {
  fullScreen?: boolean
  message?: string
}

export function FuturisticLoader({ fullScreen = false, message }: FuturisticLoaderProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-[#0D0D12]"
    : "flex items-center justify-center p-8"

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center">
        {/* Animated rings */}
        <div className="relative w-24 h-24">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[#21255B]/30"></div>

          {/* Rotating ring 1 */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#B8EDFD] animate-spin"></div>

          {/* Rotating ring 2 - slower, opposite direction */}
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#21255B]"
            style={{ animation: 'spin 1.5s linear infinite reverse' }}
          ></div>

          {/* Inner pulsing circle */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#21255B] to-[#B8EDFD] animate-pulse"></div>

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-[#B8EDFD]/50"></div>
          </div>
        </div>

        {/* Glowing orbs */}
        <div className="absolute w-32 h-32">
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-[#B8EDFD] rounded-full blur-sm animate-ping"></div>
          <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-[#21255B] rounded-full blur-sm animate-ping" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute left-0 top-1/2 w-2 h-2 bg-[#B8EDFD] rounded-full blur-sm animate-ping" style={{ animationDelay: '0.25s' }}></div>
          <div className="absolute right-0 top-1/2 w-2 h-2 bg-[#21255B] rounded-full blur-sm animate-ping" style={{ animationDelay: '0.75s' }}></div>
        </div>

        {/* Loading text */}
        {message && (
          <div className="mt-8 text-center">
            <p className="text-white text-sm font-medium animate-pulse">{message}</p>
          </div>
        )}

        {!message && (
          <div className="mt-8 flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[#B8EDFD] animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-[#B8EDFD] animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#B8EDFD] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  )
}
