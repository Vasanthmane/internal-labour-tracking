import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production-32chars'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('ilt_token')?.value

  // Public routes
  if (pathname === '/' || pathname.startsWith('/api/auth/login')) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret)
        const role = (payload as any).role
        return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/manager', request.url))
      } catch {
        // invalid token, stay on login
      }
    }
    return NextResponse.next()
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    const role = (payload as any).role

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/manager', request.url))
    }
    if (pathname.startsWith('/manager') && role !== 'manager') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('ilt_token')
    return response
  }
}

export const config = {
  matcher: ['/', '/admin/:path*', '/manager/:path*'],
}
