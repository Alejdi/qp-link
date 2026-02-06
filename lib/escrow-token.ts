import crypto from 'crypto'

// Generate a secure confirmation token for buyer
export function generateConfirmationToken(escrowId: string, buyerEmail: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is not set')
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${escrowId}:${buyerEmail}`)
    .digest('hex')
}

// Verify the confirmation token
export function verifyConfirmationToken(
  token: string,
  escrowId: string,
  buyerEmail: string
): boolean {
  try {
    const expectedToken = generateConfirmationToken(escrowId, buyerEmail)

    // Ensure both buffers are same length before comparison
    if (token.length !== expectedToken.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}
