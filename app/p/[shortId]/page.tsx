'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils'
import { generateQRCode } from '@/lib/qr'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  stripeUrl: string | null
}

export default function ProductPage() {
  const params = useParams()
  const shortId = params.shortId as string

  const [product, setProduct] = useState<Product | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProduct() {
      try {
        // Fetch product
        const response = await fetch(`/api/products/${shortId}`)
        if (!response.ok) {
          throw new Error('Product not found')
        }
        const data = await response.json()
        setProduct(data.product)

        // Track analytics
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: data.product.id }),
        })

        // Generate QR code
        const currentUrl = window.location.href
        const qr = await generateQRCode(currentUrl)
        setQrCode(qr)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [shortId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
            <p className="text-gray-600">The payment link you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-600 mb-2">QP Link</h1>
          <p className="text-gray-600">Secure Payment Link</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Information */}
          <Card className="h-fit">
            <CardContent className="p-8">
              {product.imageUrl && (
                <div className="mb-6">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h2>

              <p className="text-4xl font-bold text-primary-600 mb-6">
                {formatPrice(product.price)}
              </p>

              {product.description && (
                <p className="text-gray-600 mb-6 whitespace-pre-wrap">
                  {product.description}
                </p>
              )}

              {product.stripeUrl && (
                <a href={product.stripeUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full" size="lg">
                    Pay Now
                  </Button>
                </a>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Secure payment powered by Stripe</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="h-fit">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Scan to Pay
              </h3>

              {qrCode && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-full h-auto"
                  />
                </div>
              )}

              <p className="text-sm text-gray-600 text-center mt-4">
                Scan this QR code with your phone to access this payment link
              </p>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  This is a secure payment link created with QP Link
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 text-sm">
            Powered by{' '}
            <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">
              QP Link
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
