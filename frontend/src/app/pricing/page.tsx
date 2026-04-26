import Link from 'next/link'

const POLAR_CHECKOUT_URL = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ?? '#'

export default function PricingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Upgrade to Pro</h1>
      <div className="w-72 bg-white/5 border border-indigo-500/50 rounded-2xl p-8 flex flex-col gap-4">
        <div className="text-3xl font-black">$9.99<span className="text-base font-normal text-white/40">/mo</span></div>
        <ul className="text-sm text-white/70 space-y-2">
          <li>✓ Ranked matchmaking</li>
          <li>✓ Unlimited custom rooms</li>
          <li>✓ Profile badge</li>
          <li>✓ Priority matchmaking</li>
        </ul>
        <a
          href={POLAR_CHECKOUT_URL}
          className="block text-center py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm"
        >
          Subscribe with Polar
        </a>
      </div>
      <Link href="/play" className="text-white/40 text-sm hover:text-white">Back to Play</Link>
    </main>
  )
}
