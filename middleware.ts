import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_FILE = /\.(.*)$/
const AUTH_ROUTES = ['/auth/login', '/auth/register']
const API_BYPASS_PREFIXES = ['/api/webhooks/', '/api/inngest']

function isPublicPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return true
  }

  if (API_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(
        name: string,
        value: string,
        options: Parameters<typeof response.cookies.set>[2]
      ) {
        response.cookies.set(name, value, options)
      },
      remove(
        name: string,
        options: Parameters<typeof response.cookies.set>[2]
      ) {
        response.cookies.set(name, '', options)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user) {
      return NextResponse.redirect(new URL('/itinerary', request.url))
    }
    return response
  }

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
