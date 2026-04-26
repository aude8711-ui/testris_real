'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

function RoomList() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const ranked = params.get('ranked') === 'true'

  const [rooms, setRooms] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.listRooms().then(setRooms) }, [])

  async function createRoom() {
    if (!session) return
    setLoading(true)
    try {
      const room = await api.createRoom(
        { password: password || undefined },
        (session as any).accessToken ?? ''
      )
      router.push(`/room/${room.code}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{ranked ? 'Ranked Queue' : 'Custom Rooms'}</h1>
        <Button onClick={() => setShowCreate(true)}>Create Room</Button>
      </div>

      {rooms.length === 0 && <p className="text-white/40 text-sm">No open rooms. Create one!</p>}
      {rooms.map(r => (
        <div key={r.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg mb-2">
          <div>
            <span className="font-mono text-indigo-300 mr-3">{r.code}</span>
            <span className="text-white/60 text-sm">{r.host_nickname} · {r.player_count}/{r.max_players}</span>
          </div>
          <Button variant="secondary" onClick={() => router.push(`/room/${r.code}`)}>Join</Button>
        </div>
      ))}

      {showCreate && (
        <Modal title="Create Room" onClose={() => setShowCreate(false)}>
          <input
            className="w-full bg-white/10 rounded px-3 py-2 text-sm mb-4 outline-none placeholder:text-white/30"
            placeholder="Password (optional)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button onClick={createRoom} disabled={loading} className="w-full justify-center">
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </Modal>
      )}
    </main>
  )
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/40">Loading...</div>}>
      <RoomList />
    </Suspense>
  )
}
