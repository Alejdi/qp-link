import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Super admin email - must match the one in lib/auth.ts
const ADMIN_EMAIL = 'alejdgallubja@icloud.com' // UPDATE THIS TO YOUR EMAIL

const publicPaths = ['/', '/login', '/signup', '/p', '/dashboard']
const authPaths = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static resources
  if (
    publicPaths.some(path => pathname === path) ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow API routes but protect admin API routes
  if (pathname.startsWith('/api/')) {
    // Admin API routes require special handling
    if (pathname.startsWith('/api/admin/')) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user is admin
      const isAdmin = token.email === ADMIN_EMAIL || token.role === 'admin'
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Check if user is banned
  if (token?.isBanned) {
    // Clear session and redirect to login with error
    const response = NextResponse.redirect(new URL('/login?error=banned', request.url))
    return response
  }

  // Protect admin pages
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const url = new URL('/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Check if user is admin
    const isAdmin = token.email === ADMIN_EMAIL || token.role === 'admin'
    if (!isAdmin) {
      // Redirect non-admins to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!token && !publicPaths.includes(pathname)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (token && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
