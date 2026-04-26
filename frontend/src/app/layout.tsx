import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Testris',
  description: 'Competitive browser Tetris',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d0f] text-white antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
