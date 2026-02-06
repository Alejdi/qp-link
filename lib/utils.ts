import { nanoid } from 'nanoid'
import UAParser from 'ua-parser-js'

export function generateShortId(): string {
  return nanoid(10)
}

export function getDeviceType(userAgent: string): string {
  const parser = new UAParser(userAgent)
  const deviceType = parser.getDevice().type
  return deviceType || 'desktop'
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return '0.0.0.0'
}
