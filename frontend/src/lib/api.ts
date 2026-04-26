const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = init ?? {}
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

export const api = {
  syncUser: (google_id: string, email: string) =>
    request('/auth/sync', { method: 'POST', body: JSON.stringify({ google_id, email }) }),

  getProfile: (id: string) => request<any>(`/users/${id}`),
  setNickname: (nickname: string, token: string) =>
    request('/users/me/nickname', { method: 'PATCH', body: JSON.stringify({ nickname }), token }),
  getSettings: (token: string) => request<any>('/users/me/settings', { token }),
  saveSettings: (key_bindings: Record<string, string>, token: string) =>
    request('/users/me/settings', { method: 'PATCH', body: JSON.stringify({ key_bindings }), token }),

  listRooms: () => request<any[]>('/rooms'),
  getRoom: (code: string) => request<any>(`/rooms/${code}`),
  createRoom: (opts: { password?: string; max_players?: number; match_format?: string }, token: string) =>
    request<any>('/rooms', { method: 'POST', body: JSON.stringify(opts), token }),

  getSubscription: (token: string) => request<any>('/subscriptions/me', { token }),
}
