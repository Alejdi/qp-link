'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  price: number
  shortId: string
  stripeUrl: string
  imageUrl: string
  createdAt: string
  userId: string
  user?: { name: string; email: string }
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [page, search])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products?page=${page}&search=${search}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteId(null)
        fetchProducts()
      } else {
        alert('Failed to delete product')
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Products / Invoices</h1>
          <p className="text-[#9CA3AF] mt-1">All invoices created on the platform ({total} total)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search products by name or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-12 pr-4 py-3 bg-[#1A1A24] border border-[#2A2A3C] rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#6B7280]">Loading...</div>
        ) : products.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#6B7280]">No products found</div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] overflow-hidden hover:border-[#2A2A3C] transition-colors"
            >
              {/* Product Image */}
              {product.imageUrl ? (
                <div className="aspect-video bg-[#1A1A24] relative">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-[#1A1A24] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#2A2A3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">{product.name}</h3>
                    <p className="text-[#6B7280] text-sm truncate mt-0.5">
                      {product.description || 'No description'}
                    </p>
                  </div>
                  <p className="text-green-400 font-bold whitespace-nowrap">
                    {formatCurrency(product.price)}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#1A1A24]">
                  <Link href={`/admin/users/${product.userId}`} className="flex items-center gap-2 hover:text-red-400">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#21255B] to-[#1a1e4a] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {product.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-[#9CA3AF] text-sm truncate">
                      {product.user?.name || 'Unknown'}
                    </span>
                  </Link>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
                  <code className="bg-[#1A1A24] px-2 py-1 rounded">#{product.shortId}</code>
                  <span>{formatDate(product.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/p/${product.shortId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm text-center transition-colors"
                  >
                    View
                  </a>
                  {product.stripeUrl && (
                    <a
                      href={product.stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-sm text-center transition-colors"
                    >
                      Stripe
                    </a>
                  )}
                  <button
                    onClick={() => setDeleteId(product.id)}
                    className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50 hover:bg-[#2A2A3C] transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-[#9CA3AF]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-[#1A1A24] text-white rounded-lg disabled:opacity-50 hover:bg-[#2A2A3C] transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D12] rounded-2xl border border-[#1A1A24] max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Product</h3>
                <p className="text-[#9CA3AF] text-sm">This action cannot be undone</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-3 bg-[#1A1A24] text-white rounded-xl hover:bg-[#2A2A3C] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
