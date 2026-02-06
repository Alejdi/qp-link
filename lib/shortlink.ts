import { nanoid } from 'nanoid'

/**
 * Generate a short, URL-safe code for payment links
 * @param length - Length of the short code (default: 8)
 * @returns A unique short code
 */
export function generateShortCode(length: number = 8): string {
  // Use nanoid to generate a URL-safe random string
  // Characters used: A-Za-z0-9_-
  return nanoid(length)
}

/**
 * Generate a full shortened payment URL
 * @param shortCode - The short code for the payment
 * @param baseUrl - Base URL of the application
 * @returns Full shortened URL
 */
export function generatePaymentUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base}/pay/${shortCode}`
}

/**
 * Validate a short code format
 * @param shortCode - The short code to validate
 * @returns Whether the short code is valid
 */
export function isValidShortCode(shortCode: string): boolean {
  // Check if shortCode contains only URL-safe characters and is between 6-12 characters
  return /^[A-Za-z0-9_-]{6,12}$/.test(shortCode)
}
