import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from './socket'

interface User {
  id: string
  email: string
  name?: string
  is_paid: boolean
  is_admin: boolean
  guest_tag: string
  nickname: string | null
}

interface AppState {
  user: User | null
  socket: Socket | null
  setUser: (user: User | null) => void
  connect: (token: string) => Socket
  disconnect: () => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  socket: null,
  setUser: (user) => set({ user }),
  connect: (token) => {
    const sock = getSocket(token)
    set({ socket: sock })
    return sock
  },
  disconnect: () => {
    disconnectSocket()
    set({ socket: null })
  },
}))
