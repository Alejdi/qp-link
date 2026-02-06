'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { deleteProduct } from '@/actions/products'
import { formatPrice } from '@/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    name: string
    description: string | null
    price: any
    imageUrl: string | null
    shortId: string
    stripeUrl: string | null
    _count: {
      analytics: number
      payments: number
    }
  }
  onDelete?: () => void
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${product.shortId}`

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this product?')) return

    setIsDeleting(true)
    const result = await deleteProduct(product.id)

    if (result.error) {
      alert(result.error)
      setIsDeleting(false)
    } else {
      onDelete?.()
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(productUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass rounded-2xl shadow-glass p-5 border border-white/20 hover:shadow-glass-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 text-lg mb-1">{product.name}</h4>
          <p className="text-2xl font-bold gradient-text">
            {formatPrice(Number(product.price))}
          </p>
        </div>
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={64}
            height={64}
            className="rounded-xl object-cover shadow-md"
          />
        )}
      </div>

      {product.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/60 p-3 rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Clicks</p>
          <p className="text-xl font-bold text-slate-900">
            {product._count.analytics}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Sales</p>
          <p className="text-xl font-bold text-green-700">
            {product._count.payments}
          </p>
        </div>
      </div>

      {/* Short URL */}
      <div className="bg-white/60 p-3 rounded-xl mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Short Link</p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-primary-700 flex-1 truncate font-medium">/{product.shortId}</code>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/p/${product.shortId}`} className="flex-1">
          <Button variant="secondary" className="w-full" size="sm">
            View
          </Button>
        </Link>
        <Link href={`/dashboard/products/${product.id}/analytics`} className="flex-1">
          <Button variant="secondary" className="w-full" size="sm">
            Analytics
          </Button>
        </Link>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          isLoading={isDeleting}
          className="px-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
