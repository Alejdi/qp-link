'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface ImageCarouselProps {
  images: string[]
  alt: string
}

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // Filter out empty/null images
  const validImages = images.filter(img => img && img.trim() !== '')

  // Auto-advance slides every 5 seconds (optional)
  useEffect(() => {
    if (validImages.length <= 1 || isZoomed) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [validImages.length, isZoomed])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validImages.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  if (validImages.length === 0) {
    return (
      <div className={`rounded-2xl overflow-hidden flex items-center justify-center h-96 ${isDark ? 'bg-[#21255B]/20' : 'bg-gray-100'}`}>
        <div className="text-center">
          <svg className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No image available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Main Image Container */}
      <div
        className={`relative rounded-2xl overflow-hidden ${isDark ? 'bg-[#0D0D12]' : 'bg-gray-900'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image Wrapper with Aspect Ratio Container */}
        <div className="relative w-full" style={{ paddingBottom: '66.67%' }}> {/* 3:2 aspect ratio */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={validImages[currentIndex]}
              alt={`${alt} - Image ${currentIndex + 1}`}
              className={`max-w-full max-h-full w-auto h-auto object-contain transition-all duration-500 ${
                isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: isZoomed ? 'translate(-50%, -50%) scale(1.5)' : 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>

        {/* Navigation Arrows - Only show if multiple images */}
        {validImages.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                isDark
                  ? 'bg-black/60 hover:bg-black/80 backdrop-blur-sm'
                  : 'bg-white/80 hover:bg-white backdrop-blur-sm'
              } shadow-lg`}
              aria-label="Previous image"
            >
              <svg
                className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next Button */}
            <button
              onClick={goToNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                isDark
                  ? 'bg-black/60 hover:bg-black/80 backdrop-blur-sm'
                  : 'bg-white/80 hover:bg-white backdrop-blur-sm'
              } shadow-lg`}
              aria-label="Next image"
            >
              <svg
                className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {validImages.length > 1 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">
              {currentIndex + 1} / {validImages.length}
            </span>
          </div>
        )}

        {/* Zoom Indicator */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
            Click to {isZoomed ? 'zoom out' : 'zoom in'}
          </span>
        </div>
      </div>

      {/* Thumbnail Navigation - Only show if multiple images */}
      {validImages.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {validImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                index === currentIndex
                  ? 'ring-4 ring-blue-500 scale-105 shadow-lg'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === currentIndex && (
                <div className="absolute inset-0 bg-blue-500/20"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dot Indicators - Alternative to thumbnails for many images */}
      {validImages.length > 5 && (
        <div className="mt-4 flex justify-center gap-2">
          {validImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-blue-500'
                  : 'w-2 h-2 bg-gray-400 hover:bg-gray-500'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
