import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateShortCode, generatePaymentUrl } from '@/lib/shortlink'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await req.formData()

    const productName = formData.get('productName') as string
    const description = formData.get('description') as string
    const price = formData.get('price') as string
    const currency = (formData.get('currency') as string) || 'EUR'
    const offerExpiry = formData.get('offerExpiry') as string

    // Validation
    if (!productName || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique short code and URL
    const shortCode = generateShortCode(8)
    const invoiceUrl = generatePaymentUrl(shortCode)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(invoiceUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#21255B',
        light: '#FFFFFF',
      },
    })

    // Process images (for now, we'll store base64, but you can upload to R2 later)
    const imageUrls: string[] = []
    for (let i = 0; i < 5; i++) {
      const image = formData.get(`image${i}`) as File
      if (image) {
        // Convert to base64 for temporary storage
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        const dataUrl = `data:${image.type};base64,${base64}`
        imageUrls.push(dataUrl)
      }
    }

    // Create invoice in database
    const { data: invoice, error } = await supabaseAdmin
      .from('products')
      .insert({
        user_id: session.user.id,
        name: productName,
        description: description || null,
        price: parseFloat(price),
        currency: currency,
        image_url: imageUrls[0] || null, // Primary image (backward compatibility)
        images: imageUrls.length > 0 ? imageUrls : null, // All images array
        short_code: shortCode,
        qr_code: qrCodeDataUrl,
        upi_id: null,
        expires_at: offerExpiry ? new Date(offerExpiry).toISOString() : null,
        is_active: true,
      })
      .select('id, short_code')
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      shortCode: invoice.short_code,
      url: invoiceUrl,
      qrCode: qrCodeDataUrl,
    })
  } catch (error: any) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}
