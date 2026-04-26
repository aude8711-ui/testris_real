import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = await fetch(`${process.env.BACKEND_URL}/admin/system/maintenance-status`, {
    cache: 'no-store',
  }).catch(() => null)

  if (res?.ok) {
    const { enabled } = await res.json()
    const path = req.nextUrl.pathname
    if (enabled && !path.startsWith('/maintenance') && !path.startsWith('/admin') && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/maintenance', req.url))
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
