// Server-only module for geo IP lookup
import 'server-only'
import geoip from 'geoip-lite'

export function getCountryFromIP(ip: string): string | null {
  const geo = geoip.lookup(ip)
  return geo?.country || null
}
