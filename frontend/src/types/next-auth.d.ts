import 'next-auth'
declare module 'next-auth' {
  interface User {
    id: string
    is_paid: boolean
    is_admin: boolean
    guest_tag: string
    nickname: string | null
  }
  interface Session {
    user: User & { email: string; name?: string }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    is_paid: boolean
    is_admin: boolean
    guest_tag: string
    nickname: string | null
  }
}
