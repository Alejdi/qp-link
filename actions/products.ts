'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteImage } from '@/lib/r2'
import { createPaymentLink } from '@/lib/stripe'
import { generateShortId } from '@/lib/utils'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'Price must be greater than 0'),
})

export async function createProduct(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const price = parseFloat(formData.get('price') as string)
    const image = formData.get('image') as File | null

    const validatedData = productSchema.parse({ name, description, price })

    // Upload image if provided
    let imageUrl: string | undefined
    if (image && image.size > 0) {
      imageUrl = await uploadImage(image)
    }

    // Generate short ID
    const shortId = generateShortId()

    // Create product first to get the ID
    const product = await prisma.product.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        price: validatedData.price,
        imageUrl: imageUrl || null,
        shortId,
        stripeUrl: null,
      },
    })

    // Create Stripe payment link
    const stripeUrl = await createPaymentLink(
      validatedData.name,
      validatedData.price,
      product.id,
      imageUrl
    )

    // Update product with Stripe URL
    await prisma.product.update({
      where: { id: product.id },
      data: { stripeUrl },
    })

    revalidatePath('/dashboard')

    return { success: true, productId: product.id }
  } catch (error: any) {
    console.error('Error creating product:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to create product' }
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Check if user owns the product
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existingProduct || existingProduct.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const price = parseFloat(formData.get('price') as string)
    const image = formData.get('image') as File | null

    const validatedData = productSchema.parse({ name, description, price })

    // Upload new image if provided
    let imageUrl = existingProduct.imageUrl
    if (image && image.size > 0) {
      // Delete old image
      if (existingProduct.imageUrl) {
        await deleteImage(existingProduct.imageUrl)
      }
      imageUrl = await uploadImage(image)
    }

    // Update product
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        price: validatedData.price,
        imageUrl,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath(`/p/${existingProduct.shortId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to update product' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Check if user owns the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || product.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    // Delete image from R2
    if (product.imageUrl) {
      await deleteImage(product.imageUrl)
    }

    // Delete product (this will cascade delete analytics and payments)
    await prisma.product.delete({
      where: { id: productId },
    })

    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { error: 'Failed to delete product' }
  }
}

export async function getProducts() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            analytics: true,
            payments: {
              where: {
                status: 'completed',
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { products }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { error: 'Failed to fetch products' }
  }
}

export async function getProduct(productId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            analytics: true,
            payments: {
              where: {
                status: 'completed',
              },
            },
          },
        },
      },
    })

    if (!product || product.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    return { product }
  } catch (error) {
    console.error('Error fetching product:', error)
    return { error: 'Failed to fetch product' }
  }
}
