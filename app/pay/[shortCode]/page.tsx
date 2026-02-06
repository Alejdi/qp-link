'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FuturisticLoader } from '@/components/ui/FuturisticLoader'

export default function PaymentPage() {
  const params = useParams()
  const shortCode = params.shortCode as string

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  useEffect(() => {
    if (shortCode) {
      fetchInvoice()
    }
  }, [shortCode])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/public/${shortCode}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Payment link not found')
        } else {
          setError('Failed to load payment details')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setInvoice(data)

      // Check if expired
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at)
        if (expiryDate < new Date()) {
          setIsExpired(true)
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
      setError('Failed to load payment details')
    } finally {
      setLoading(false)
    }
  }

  const handlePayNow = () => {
    // Track payment click
    fetch(`/api/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: invoice.id,
        event: 'payment_initiated',
      }),
    }).catch(err => console.error('Analytics error:', err))

    // Redirect to checkout page using short_code
    window.location.href = `/payment/${invoice.short_code || invoice.id}`
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

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const openFullscreen = (index: number) => {
    setCurrentImageIndex(index)
    setIsFullscreen(true)
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  // Get images array (for now just the main image, but ready for multiple images)
  const images = invoice?.image_url ? [invoice.image_url] : []

  if (loading) {
    return <FuturisticLoader fullScreen message="Loading payment details..." />
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">{error || 'Payment link not found'}</h1>
          <p className="text-[#9CA3AF]">Please check the link and try again</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#0D0D12] px-4 py-12 relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="QP Link" width="64" height="64" className="mx-auto mb-4 object-contain" />
            <h2 className="text-2xl font-bold text-white">Secure Payment</h2>
          </div>

          {/* Payment Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Image Gallery */}
            {images.length > 0 && (
              <div className="relative">
                <div
                  className="relative h-96 overflow-hidden cursor-pointer"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => openFullscreen(currentImageIndex)}
                >
                  <img
                    src={images[currentImageIndex]}
                    alt={invoice.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />

                  {/* Image counter */}
                  {images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      {currentImageIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            prevImage()
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-all"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      {currentImageIndex < images.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            nextImage()
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-all"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}

                  {/* Fullscreen button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openFullscreen(currentImageIndex)
                    }}
                    className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-black/70 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>

                {/* Thumbnail dots */}
                {images.length > 1 && (
                  <div className="flex justify-center gap-2 py-4 bg-white/5">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex ? 'bg-white w-8' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Details */}
            <div className="p-8">
              {/* Expired Notice */}
              {isExpired && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                  This payment link has expired
                </div>
              )}

              {/* Title & Description */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-3">{invoice.name}</h1>
                {invoice.description && (
                  <p className="text-[#9CA3AF] text-lg leading-relaxed">{invoice.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[#9CA3AF] text-lg">Total Amount</span>
                  <span className="text-4xl font-bold text-white">€{invoice.price.toLocaleString()}</span>
                </div>
              </div>

              {/* Expiry Info */}
              {invoice.expires_at && !isExpired && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Offer expires on {(() => {
                    const date = new Date(invoice.expires_at)
                    const day = String(date.getDate()).padStart(2, '0')
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const year = date.getFullYear()
                    const hours = String(date.getHours()).padStart(2, '0')
                    const minutes = String(date.getMinutes()).padStart(2, '0')
                    return `${day}/${month}/${year} at ${hours}:${minutes}`
                  })()}</span>
                </div>
              )}

              {/* Pay Now Button */}
              <button
                onClick={handlePayNow}
                disabled={isExpired || !invoice.is_active}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#21255B] to-[#2D3270] hover:from-[#2D3270] hover:to-[#21255B] text-white text-xl font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-[#21255B]/30 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isExpired ? 'Offer Expired' : !invoice.is_active ? 'Payment Link Inactive' : 'Pay Now'}
              </button>

              {/* Payment Info */}
              <div className="mt-6 text-center">
                <p className="text-[#9CA3AF] text-sm">
                  Secure payment • Powered by QP Link
                </p>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[#9CA3AF] text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secured with 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={closeFullscreen}
        >
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg transition-all z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}

          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[currentImageIndex]}
              alt={invoice.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevImage()
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-4 rounded-full hover:bg-white/20 transition-all"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentImageIndex < images.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextImage()
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-4 rounded-full hover:bg-white/20 transition-all"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Thumbnail dots */}
          {images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center gap-3 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(index)
                  }}
                  className={`transition-all ${
                    index === currentImageIndex
                      ? 'w-3 h-3 bg-white rounded-full'
                      : 'w-2 h-2 bg-white/40 rounded-full hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
