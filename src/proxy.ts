import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const session = await auth()
    
    if (!session.userId) {
      const url = new URL('/login', req.url)
      url.searchParams.set('next', req.nextUrl.pathname)
      return Response.redirect(url)
    }

    try {
      const client = await clerkClient()
      const user = await client.users.getUser(session.userId)
      const email = user.emailAddresses[0]?.emailAddress || ""
      
      if (email.toLowerCase() !== 'somyadipghosh@gmail.com') {
        const url = new URL('/dashboard', req.url)
        return Response.redirect(url)
      }
    } catch (error) {
      console.error("Clerk middleware admin check failed:", error)
      const url = new URL('/dashboard', req.url)
      return Response.redirect(url)
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
