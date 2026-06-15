import '@/lib/env-loader'
import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])

const handler = clerkMiddleware(async (auth, req) => {
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

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  try {
    return await handler(req, event)
  } catch (err: any) {
    console.error("PROXY EXECUTION ERROR:", err)
    
    const envStatus = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "DEFINED" : "UNDEFINED",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? "DEFINED" : "UNDEFINED",
      APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID ? "DEFINED" : "UNDEFINED",
      APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID ? "DEFINED" : "UNDEFINED",
      ADMIN_EMAILS: process.env.ADMIN_EMAILS ? "DEFINED" : "UNDEFINED",
      NODE_ENV: process.env.NODE_ENV || "not set",
    }
    
    return new Response(
      `<html>
        <head><title>Proxy Debug Error</title></head>
        <body style="font-family: monospace; padding: 20px; background: #1a1a1a; color: #ff6b6b;">
          <h1>Proxy Execution Error</h1>
          <p><strong>Error Message:</strong> ${err.message || err}</p>
          <pre style="background: #2a2a2a; padding: 15px; border-radius: 5px; color: #eee; overflow-x: auto;">${err.stack || "No stack trace available"}</pre>
          <h2>Environment Status</h2>
          <table border="1" cellpadding="8" style="border-collapse: collapse; color: #eee; background: #2a2a2a;">
            <tr><th>Variable</th><th>Status</th></tr>
            ${Object.entries(envStatus).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
          </table>
        </body>
      </html>`,
      {
        status: 500,
        headers: {
          'content-type': 'text/html',
        }
      }
    )
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}

