import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { JWT } from 'next-auth/jwt'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  jwt: {
    encode: async ({ token, secret }) => {
      const { SignJWT } = await import('jose')
      const key = new TextEncoder().encode(secret as string)
      return new SignJWT(token as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key)
    },
    decode: async ({ token, secret }) => {
      const { jwtVerify } = await import('jose')
      const key = new TextEncoder().encode(secret as string)
      const { payload } = await jwtVerify(token!, key)
      return payload as JWT
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.providerAccountId || !user.email) return false
      const res = await fetch(`${process.env.BACKEND_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_id: account.providerAccountId,
          email: user.email,
        }),
      })
      if (!res.ok) return false
      const data = await res.json()
      Object.assign(user, {
        id: data.id,
        is_paid: data.is_paid,
        is_admin: data.is_admin,
        guest_tag: data.guest_tag,
        nickname: data.nickname,
      })
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.is_paid = (user as any).is_paid
        token.is_admin = (user as any).is_admin
        token.guest_tag = (user as any).guest_tag
        token.nickname = (user as any).nickname
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.is_paid = token.is_paid as boolean
      session.user.is_admin = token.is_admin as boolean
      session.user.guest_tag = token.guest_tag as string
      session.user.nickname = token.nickname as string | null
      return session
    },
  },
})
