'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-black text-indigo-400">TESTRIS</h1>
      <Button onClick={() => signIn('google', { callbackUrl: '/play' })} className="text-base px-8 py-3">
        Sign in with Google
      </Button>
    </main>
  )
}
