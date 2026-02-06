'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function CreateInvoicePage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryTime, setExpiryTime] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [currencies, setCurrencies] = useState<any[]>([])
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await fetch('/api/currencies')
        if (res.ok) {
          const data = await res.json()
          setCurrencies(data.currencies || [])
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error)
      } finally {
        setLoadingCurrencies(false)
      }
    }
    fetchCurrencies()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addImages(files)
    }
  }

  const addImages = (files: File[]) => {
    const remainingSlots = 5 - images.length
    const filesToAdd = files.slice(0, remainingSlots)

    if (files.length > remainingSlots) {
      setError(`You can only upload up to 5 images. ${remainingSlots} slot(s) remaining.`)
      setTimeout(() => setError(''), 3000)
    }

    const newImages = [...images, ...filesToAdd]
    setImages(newImages)

    // Create previews
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)

    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index])

    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      addImages(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validation
      if (!productName || !price) {
        setError('Please fill in all required fields')
        setIsLoading(false)
        return
      }

      if (parseFloat(price) <= 0) {
        setError('Price must be greater than 0')
        setIsLoading(false)
        return
      }

      // Combine date and time for expiry
      let offerExpiry = ''
      if (expiryDate && expiryTime) {
        offerExpiry = `${expiryDate}T${expiryTime}`
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('productName', productName)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('currency', currency)
      formData.append('offerExpiry', offerExpiry)

      images.forEach((image, index) => {
        formData.append(`image${index}`, image)
      })

      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invoice')
      }

      const data = await response.json()
      router.push(`/dashboard/invoice-success?id=${data.invoiceId}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D12] px-4 py-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#21255B]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#B8EDFD]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#21255B]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#B8EDFD] hover:text-white transition-colors mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Create Invoice</h1>
          <p className="text-[#9CA3AF]">Generate a payment link with QR code</p>
        </div>

        {/* Form Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Product/Service Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                placeholder="iPhone 15 Pro Max"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brand new, sealed box, 256GB, Space Black..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Price <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="99999"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Currency <span className="text-red-400">*</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                >
                  {loadingCurrencies ? (
                    <option>Loading...</option>
                  ) : (
                    currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Offer Expiry */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Offer Expires On (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    value={expiryTime}
                    onChange={(e) => setExpiryTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#21255B] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Product Images (Max 5)
              </label>

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? 'border-[#21255B] bg-[#21255B]/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={images.length >= 5}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer ${images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-[#9CA3AF]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-white mb-2">
                    {images.length >= 5 ? 'Maximum images reached' : 'Drag & drop images here'}
                  </p>
                  <p className="text-[#9CA3AF] text-sm">
                    or click to browse ({images.length}/5)
                  </p>
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-[#21255B] hover:bg-[#2D3270] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#21255B]/20 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Creating Invoice...' : 'Create Invoice & Generate Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
