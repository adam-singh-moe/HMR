import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /dashboard, /auth)
  const pathname = request.nextUrl.pathname

  // Define paths that don't require authentication
  const publicPaths = ['/auth']

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Get the user session from cookies
  const userSession = request.cookies.get('user_session')

  // Handle root path specially - allow loading screen to show first
  if (pathname === '/') {
    // Allow the loading screen to show on first visit
    // The page component will handle the redirect to /auth after loading
    return NextResponse.next()
  }

  // If the path is auth and user is authenticated, redirect to appropriate dashboard
  if (pathname === '/auth' && userSession) {
    try {
      const user = JSON.parse(userSession.value)
      const role = user.role

      // Redirect to appropriate dashboard based on role
      if (role === "Head Teacher") {
        return NextResponse.redirect(new URL('/dashboard/head-teacher', request.url))
      } else if (role === "Regional Officer") {
        return NextResponse.redirect(new URL('/dashboard/regional-officer', request.url))
      } else if (role === "Admin") {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url))
      } else if (role === "Education Official") {
        return NextResponse.redirect(new URL('/dashboard/education-official', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      // If session is invalid, clear cookie and continue to auth page
      const response = NextResponse.next()
      response.cookies.delete('user_session')
      return response
    }
  }

  // If the path is protected and user is not authenticated, redirect to auth
  if (!isPublicPath && !userSession) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // If user is authenticated but accessing wrong role dashboard, redirect to correct one
  if (!isPublicPath && userSession) {
    try {
      const user = JSON.parse(userSession.value)
      const role = user.role

      // Check role-based access control
      if (pathname.startsWith('/dashboard/admin') && role !== "Admin") {
        return NextResponse.redirect(new URL('/auth', request.url))
      }
      
      if (pathname.startsWith('/dashboard/education-official') && role !== "Education Official") {
        return NextResponse.redirect(new URL('/auth', request.url))
      }
      
      if (pathname.startsWith('/dashboard/regional-officer') && role !== "Regional Officer") {
        return NextResponse.redirect(new URL('/auth', request.url))
      }
      
      if (pathname.startsWith('/dashboard/head-teacher') && role !== "Head Teacher") {
        return NextResponse.redirect(new URL('/auth', request.url))
      }

    } catch (error) {
      // If session is invalid, redirect to auth
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}
