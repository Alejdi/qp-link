import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export async function createPaymentLink(
  productName: string,
  price: number,
  productId: string,
  imageUrl?: string
): Promise<string> {
  // Create a product in Stripe
  const product = await stripe.products.create({
    name: productName,
    images: imageUrl ? [imageUrl] : [],
    metadata: {
      productId,
    },
  })

  // Create a price for the product
  const priceObj = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100), // Convert to cents
    currency: 'usd',
  })

  // Create a payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: priceObj.id,
        quantity: 1,
      },
    ],
    metadata: {
      productId,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?productId=${productId}`,
      },
    },
  })

  return paymentLink.url
}
