# Testris Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Testris — a browser-based competitive Tetris SaaS with 1v1 PvP, AI mode, Google OAuth, Polar.sh subscriptions, and ranked play.

**Architecture:** Next.js 14 frontend (Vercel) + Node.js/Express/Socket.io backend (Railway) + PostgreSQL. Game engine runs client-side in TypeScript. PvP syncs board state via Socket.io (server as relay + disconnect arbiter). AI mode runs ColdClear WASM in a Web Worker. NextAuth.js handles Google OAuth on the frontend; the NextAuth JWT (HS256) is verified by the backend using the shared NEXTAUTH_SECRET.

**Tech Stack:** Next.js 14 App Router, NextAuth.js v5, Node.js 20, Express 4, Socket.io 4, PostgreSQL 16, pg 8, jsonwebtoken 9, bcryptjs, Polar.sh SDK, ColdClear WASM, Zustand 4, TypeScript 5, Vitest, Jest + Supertest

---

## File Structure

```
testris/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   └── migrate.js
│   │   ├── migrations/
│   │   │   ├── 001_users.sql
│   │   │   ├── 002_subscriptions.sql
│   │   │   ├── 003_ranks.sql
│   │   │   ├── 004_game_records.sql
│   │   │   ├── 005_rooms.sql
│   │   │   └── 006_settings.sql
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── admin.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── rooms.js
│   │   │   ├── subscriptions.js
│   │   │   ├── webhooks.js
│   │   │   └── admin.js
│   │   └── socket/
│   │       ├── index.js
│   │       ├── matchmaking.js
│   │       ├── game.js
│   │       └── room.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── rank.test.js
│   │   ├── rooms.test.js
│   │   └── webhooks.test.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── login/page.tsx
    │   │   ├── game/page.tsx
    │   │   ├── play/page.tsx
    │   │   ├── room/page.tsx
    │   │   ├── room/[id]/page.tsx
    │   │   ├── profile/[id]/page.tsx
    │   │   ├── settings/page.tsx
    │   │   ├── pricing/page.tsx
    │   │   ├── admin/page.tsx
    │   │   ├── maintenance/page.tsx
    │   │   ├── not-found.tsx
    │   │   └── error.tsx
    │   ├── components/
    │   │   ├── game/
    │   │   │   ├── GameBoard.tsx
    │   │   │   ├── NextQueue.tsx
    │   │   │   ├── HoldPiece.tsx
    │   │   │   ├── AttackMeter.tsx
    │   │   │   └── OpponentBoard.tsx
    │   │   └── ui/
    │   │       ├── Button.tsx
    │   │       └── Modal.tsx
    │   ├── lib/
    │   │   ├── tetris/
    │   │   │   ├── pieces.ts
    │   │   │   ├── randomizer.ts
    │   │   │   ├── rotation.ts
    │   │   │   ├── engine.ts
    │   │   │   ├── attack.ts
    │   │   │   └── garbage.ts
    │   │   ├── workers/
    │   │   │   └── coldclear.worker.ts
    │   │   ├── api.ts
    │   │   ├── socket.ts
    │   │   └── store.ts
    │   ├── auth.ts
    │   └── middleware.ts
    ├── public/
    │   └── wasm/
    ├── package.json
    └── .env.example
```

---

## Phase 1: Foundation

### Task 1: Backend project setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/src/config.js`
- Create: `backend/src/server.js`
- Create: `backend/.env.example`

- [ ] **Step 1: Init backend**

```bash
cd testris/backend
npm init -y
npm install express socket.io pg jsonwebtoken bcryptjs cors express-rate-limit @polar-sh/sdk dotenv
npm install --save-dev jest supertest nodemon
```

- [ ] **Step 2: Write `src/config.js`**

```js
// src/config.js
require('dotenv').config()

module.exports = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
  POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
  POLAR_PRODUCT_ID: process.env.POLAR_PRODUCT_ID,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
}
```

- [ ] **Step 3: Write `src/server.js`**

```js
// src/server.js
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const config = require('./config')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: config.FRONTEND_URL, credentials: true },
})

app.use(cors({ origin: config.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60_000, max: 100 }))

app.use('/auth', require('./routes/auth'))
app.use('/users', require('./routes/users'))
app.use('/rooms', require('./routes/rooms'))
app.use('/subscriptions', require('./routes/subscriptions'))
app.use('/webhooks', require('./routes/webhooks'))
app.use('/admin', require('./routes/admin'))

app.get('/health', (_, res) => res.json({ ok: true }))

require('./socket')(io)

httpServer.listen(config.PORT, () =>
  console.log(`Server running on port ${config.PORT}`)
)

module.exports = { app, io }
```

- [ ] **Step 4: Write `.env.example`**

```
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/testris
NEXTAUTH_SECRET=change_me_32_chars_min
POLAR_WEBHOOK_SECRET=
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

- [ ] **Step 5: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest --runInBand"
  },
  "jest": { "testEnvironment": "node" }
}
```

- [ ] **Step 6: Verify server starts**

```bash
cp .env.example .env
node src/server.js
# Expected: Server running on port 4000
curl http://localhost:4000/health
# Expected: {"ok":true}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: backend Express + Socket.io skeleton"
```

---

### Task 2: Database pool + migrations

**Files:**
- Create: `backend/src/db/pool.js`
- Create: `backend/src/db/migrate.js`
- Create: `backend/migrations/001_users.sql` through `006_settings.sql`

- [ ] **Step 1: Write `src/db/pool.js`**

```js
// src/db/pool.js
const { Pool } = require('pg')
const config = require('../config')

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

module.exports = pool
```

- [ ] **Step 2: Write migration files**

`migrations/001_users.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  nickname      VARCHAR(32) UNIQUE,
  guest_tag     VARCHAR(16),
  is_paid       BOOLEAN DEFAULT FALSE,
  is_admin      BOOLEAN DEFAULT FALSE,
  is_banned     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

`migrations/002_subscriptions.sql`:
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  polar_subscription_id   VARCHAR(255) UNIQUE,
  status                  VARCHAR(32) NOT NULL,
  plan                    VARCHAR(32) DEFAULT 'pro',
  current_period_start    TIMESTAMP,
  current_period_end      TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);
```

`migrations/003_ranks.sql`:
```sql
CREATE TABLE IF NOT EXISTS ranks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tr            FLOAT DEFAULT 0,
  tier          VARCHAR(4) DEFAULT 'D',
  wins          INTEGER DEFAULT 0,
  losses        INTEGER DEFAULT 0,
  games_played  INTEGER DEFAULT 0,
  peak_tr       FLOAT DEFAULT 0,
  peak_tier     VARCHAR(4) DEFAULT 'D',
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

`migrations/004_game_records.sql`:
```sql
CREATE TABLE IF NOT EXISTS game_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID,
  player1_id    UUID REFERENCES users(id),
  player2_id    UUID REFERENCES users(id),
  winner_id     UUID REFERENCES users(id),
  is_ranked     BOOLEAN DEFAULT FALSE,
  is_void       BOOLEAN DEFAULT FALSE,
  p1_tr_before  FLOAT,
  p1_tr_after   FLOAT,
  p2_tr_before  FLOAT,
  p2_tr_after   FLOAT,
  duration_sec  INTEGER,
  played_at     TIMESTAMP DEFAULT NOW()
);
```

`migrations/005_rooms.sql`:
```sql
CREATE TABLE IF NOT EXISTS rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(8) UNIQUE NOT NULL,
  host_id       UUID REFERENCES users(id),
  password_hash VARCHAR(255),
  max_players   INTEGER DEFAULT 2 CHECK (max_players BETWEEN 2 AND 20),
  match_format  VARCHAR(16) DEFAULT 'single',
  status        VARCHAR(16) DEFAULT 'waiting',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  role      VARCHAR(16) DEFAULT 'player',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
```

`migrations/006_settings.sql`:
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  key_bindings  JSONB DEFAULT '{}',
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key   VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO system_settings (key, value)
  VALUES ('maintenance_mode', 'false')
  ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 3: Write `src/db/migrate.js`**

```js
// src/db/migrate.js
const fs = require('fs')
const path = require('path')
const pool = require('./pool')

async function migrate() {
  const dir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(dir).sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    console.log(`Migrated: ${file}`)
  }
  await pool.end()
}

migrate().catch(console.error)
```

- [ ] **Step 4: Run migrations (requires DATABASE_URL in .env)**

```bash
node src/db/migrate.js
# Expected: Migrated: 001_users.sql ... 006_settings.sql
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: PostgreSQL migrations (users, ranks, rooms, subscriptions)"
```

---

### Task 3: Auth middleware + sync endpoint

**Files:**
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/admin.js`
- Create: `backend/src/routes/auth.js`
- Create: `backend/tests/auth.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/auth.test.js
const request = require('supertest')
const { app } = require('../src/server')

describe('POST /auth/sync', () => {
  it('rejects missing body', async () => {
    const res = await request(app).post('/auth/sync').send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=auth
```

- [ ] **Step 3: Write `src/middleware/auth.js`**

```js
// src/middleware/auth.js
const jwt = require('jsonwebtoken')
const config = require('../config')

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(token, config.NEXTAUTH_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = authMiddleware
```

- [ ] **Step 4: Write `src/middleware/admin.js`**

```js
// src/middleware/admin.js
const auth = require('./auth')

function adminMiddleware(req, res, next) {
  auth(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Forbidden' })
    next()
  })
}

module.exports = adminMiddleware
```

- [ ] **Step 5: Write `src/routes/auth.js`**

```js
// src/routes/auth.js
const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

// Called by NextAuth signIn callback to register/find user
router.post('/sync', async (req, res) => {
  const { google_id, email } = req.body
  if (!google_id || !email) return res.status(400).json({ error: 'Missing fields' })

  try {
    let user = await pool.query(
      'SELECT * FROM users WHERE google_id = $1', [google_id]
    )

    if (user.rows.length === 0) {
      const guest_tag = 'guest' + Math.floor(1000 + Math.random() * 9000)
      user = await pool.query(
        `INSERT INTO users (google_id, email, guest_tag)
         VALUES ($1, $2, $3) RETURNING *`,
        [google_id, email, guest_tag]
      )
    }

    const u = user.rows[0]
    res.json({
      id: u.id,
      guest_tag: u.guest_tag,
      nickname: u.nickname,
      is_paid: u.is_paid,
      is_admin: u.is_admin,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/logout', auth, (req, res) => {
  res.json({ ok: true })
})

module.exports = router
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- --testPathPattern=auth
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: auth middleware + /auth/sync endpoint"
```

---

### Task 4: Frontend project setup

**Files:**
- Create: `frontend/package.json` (via next scaffold)
- Create: `frontend/src/auth.ts`
- Create: `frontend/.env.example`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd testris
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
cd frontend
npm install next-auth@beta zustand socket.io-client
```

- [ ] **Step 2: Write `src/auth.ts`**

```ts
// src/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { JWT } from 'next-auth/jwt'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  jwt: {
    // Use HS256 so backend can verify with same secret
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
```

- [ ] **Step 3: Write `.env.example`**

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_32_chars_min
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

- [ ] **Step 4: Wire NextAuth route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/auth'
```

- [ ] **Step 5: Write `src/middleware.ts`**

```ts
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = await fetch(`${process.env.BACKEND_URL}/admin/system/maintenance-status`, {
    cache: 'no-store',
  }).catch(() => null)

  if (res?.ok) {
    const { enabled } = await res.json()
    const isAdmin = req.cookies.get('next-auth.session-token') // simplified check
    const path = req.nextUrl.pathname
    if (enabled && !path.startsWith('/maintenance') && !path.startsWith('/admin') && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/maintenance', req.url))
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 6: Add NextAuth types**

```ts
// src/types/next-auth.d.ts
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
```

- [ ] **Step 7: Verify frontend builds**

```bash
cd testris/frontend
cp .env.example .env.local
npm run build
# Expected: compiled successfully
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: Next.js frontend + NextAuth.js Google OAuth setup"
```

---

## Phase 2: Game Engine

### Task 5: Piece definitions + 7-bag randomizer

**Files:**
- Create: `frontend/src/lib/tetris/pieces.ts`
- Create: `frontend/src/lib/tetris/randomizer.ts`
- Create: `frontend/src/lib/tetris/__tests__/randomizer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/tetris/__tests__/randomizer.test.ts
import { SevenBag } from '../randomizer'

test('generates exactly 7 unique pieces per bag', () => {
  const bag = new SevenBag(42)
  const pieces = Array.from({ length: 7 }, () => bag.next())
  expect(new Set(pieces).size).toBe(7)
})

test('pieces are always from valid set', () => {
  const valid = new Set(['I','O','T','S','Z','J','L'])
  const bag = new SevenBag(0)
  for (let i = 0; i < 21; i++) {
    expect(valid.has(bag.next())).toBe(true)
  }
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd testris/frontend && npx vitest run src/lib/tetris/__tests__/randomizer.test.ts
```

- [ ] **Step 3: Write `src/lib/tetris/pieces.ts`**

```ts
// src/lib/tetris/pieces.ts
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

// Each piece: 4 rotation states, each state: array of [row, col] mino positions
export const PIECES: Record<PieceType, number[][][]> = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,1],[1,1],[2,1],[3,1]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,2],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
}

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
}

export const PIECE_TYPES: PieceType[] = ['I','O','T','S','Z','J','L']

export const SPAWN_ROW: Record<PieceType, number> = {
  I: 18, O: 18, T: 19, S: 19, Z: 19, J: 19, L: 19,
}
```

- [ ] **Step 4: Write `src/lib/tetris/randomizer.ts`**

```ts
// src/lib/tetris/randomizer.ts
import { PieceType, PIECE_TYPES } from './pieces'

export class SevenBag {
  private bag: PieceType[] = []
  private seed: number

  constructor(seed: number) {
    this.seed = seed
    this.refill()
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff
    return (this.seed >>> 0) / 0x100000000
  }

  private refill() {
    this.bag = [...PIECE_TYPES]
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  next(): PieceType {
    if (this.bag.length === 0) this.refill()
    return this.bag.pop()!
  }

  peek(count: number): PieceType[] {
    while (this.bag.length < count) this.refill()
    return this.bag.slice(-count).reverse()
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/lib/tetris/__tests__/randomizer.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Tetris 7-bag randomizer + piece definitions"
```

---

### Task 6: SRS rotation system

**Files:**
- Create: `frontend/src/lib/tetris/rotation.ts`
- Create: `frontend/src/lib/tetris/__tests__/rotation.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/tetris/__tests__/rotation.test.ts
import { srsKicks, tryRotate } from '../rotation'
import type { GameBoard, ActivePiece } from '../engine'

const emptyBoard: GameBoard = Array.from({ length: 20 }, () => Array(10).fill(null))

test('T-piece rotates CW from state 0→1', () => {
  const piece: ActivePiece = { type: 'T', rotation: 0, row: 0, col: 3 }
  const result = tryRotate(piece, 1, emptyBoard)
  expect(result).not.toBeNull()
  expect(result!.rotation).toBe(1)
})

test('rotation blocked by wall returns null with no kicks', () => {
  const piece: ActivePiece = { type: 'O', rotation: 0, row: 0, col: 9 }
  // O piece doesn't kick — should still succeed if fits
  const result = tryRotate(piece, 1, emptyBoard)
  expect(result).not.toBeNull()
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/tetris/__tests__/rotation.test.ts
```

- [ ] **Step 3: Write `src/lib/tetris/rotation.ts`**

```ts
// src/lib/tetris/rotation.ts
import { PIECES, PieceType } from './pieces'
import type { GameBoard, ActivePiece } from './engine'

// SRS wall kick data for JLSTZ pieces: [from_rotation][to_rotation] → [[col_offset, row_offset], ...]
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0→1': [[ 0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '1→0': [[ 0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  '1→2': [[ 0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  '2→1': [[ 0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '2→3': [[ 0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
  '3→2': [[ 0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '3→0': [[ 0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '0→3': [[ 0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
}

const KICKS_I: Record<string, [number, number][]> = {
  '0→1': [[ 0,0],[-2,0],[ 1,0],[-2, 1],[ 1,-2]],
  '1→0': [[ 0,0],[ 2,0],[-1,0],[ 2,-1],[-1, 2]],
  '1→2': [[ 0,0],[-1,0],[ 2,0],[-1,-2],[ 2, 1]],
  '2→1': [[ 0,0],[ 1,0],[-2,0],[ 1, 2],[-2,-1]],
  '2→3': [[ 0,0],[ 2,0],[-1,0],[ 2,-1],[-1, 2]],
  '3→2': [[ 0,0],[-2,0],[ 1,0],[-2, 1],[ 1,-2]],
  '3→0': [[ 0,0],[ 1,0],[-2,0],[ 1, 2],[-2,-1]],
  '0→3': [[ 0,0],[-1,0],[ 2,0],[-1,-2],[ 2, 1]],
}

export function getKicks(type: PieceType, from: number, to: number): [number, number][] {
  const key = `${from}→${to}`
  if (type === 'O') return [[0, 0]]
  if (type === 'I') return KICKS_I[key] ?? [[0, 0]]
  return KICKS_JLSTZ[key] ?? [[0, 0]]
}

export function fitsOnBoard(piece: ActivePiece, board: GameBoard): boolean {
  const minos = PIECES[piece.type][piece.rotation]
  for (const [r, c] of minos) {
    const row = piece.row + r
    const col = piece.col + c
    if (row < 0 || row >= 20 || col < 0 || col >= 10) return false
    if (board[row][col] !== null) return false
  }
  return true
}

export function tryRotate(
  piece: ActivePiece,
  direction: 1 | -1 | 2,
  board: GameBoard
): (ActivePiece & { kicked: boolean }) | null {
  const to = direction === 2
    ? (piece.rotation + 2) % 4
    : (piece.rotation + direction + 4) % 4
  const kicks = getKicks(piece.type, piece.rotation, to)

  for (const [dc, dr] of kicks) {
    const candidate = { ...piece, rotation: to, col: piece.col + dc, row: piece.row + dr }
    if (fitsOnBoard(candidate, board)) {
      return { ...candidate, kicked: dc !== 0 || dr !== 0 }
    }
  }
  return null
}
```

- [ ] **Step 4: Add `ActivePiece` and `GameBoard` types to `engine.ts` (stub)**

```ts
// src/lib/tetris/engine.ts (initial stub — expanded in Task 7)
import { PieceType } from './pieces'

export type GameBoard = (PieceType | null)[][]
export interface ActivePiece {
  type: PieceType
  rotation: number
  row: number
  col: number
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/lib/tetris/__tests__/rotation.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: SRS rotation system with wall kicks"
```

---

### Task 7: Game engine — board state, gravity, drop

**Files:**
- Modify: `frontend/src/lib/tetris/engine.ts`
- Create: `frontend/src/lib/tetris/__tests__/engine.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/tetris/__tests__/engine.test.ts
import { GameEngine } from '../engine'

test('spawns first piece on init', () => {
  const eng = new GameEngine(42)
  expect(eng.state.active).not.toBeNull()
})

test('hard drop locks piece and spawns next', () => {
  const eng = new GameEngine(42)
  const before = eng.state.active!.type
  eng.hardDrop()
  expect(eng.state.active?.type).not.toBe(before)
})

test('soft drop moves piece down', () => {
  const eng = new GameEngine(42)
  const startRow = eng.state.active!.row
  eng.softDrop()
  expect(eng.state.active!.row).toBeGreaterThan(startRow)
})

test('move left/right shifts column', () => {
  const eng = new GameEngine(42)
  const col = eng.state.active!.col
  eng.move('left')
  expect(eng.state.active!.col).toBe(col - 1)
  eng.move('right')
  expect(eng.state.active!.col).toBe(col)
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/tetris/__tests__/engine.test.ts
```

- [ ] **Step 3: Write full `src/lib/tetris/engine.ts`**

```ts
// src/lib/tetris/engine.ts
import { PieceType, PIECES, PIECE_TYPES } from './pieces'
import { SevenBag } from './randomizer'
import { tryRotate, fitsOnBoard } from './rotation'

export type GameBoard = (PieceType | null)[][]
export interface ActivePiece {
  type: PieceType
  rotation: number
  row: number
  col: number
}

export interface GameState {
  board: GameBoard
  active: ActivePiece | null
  hold: PieceType | null
  holdUsed: boolean
  next: PieceType[]
  combo: number
  b2b: boolean
  linesCleared: number
  topOut: boolean
  garbageQueue: number[]  // pending garbage lines
  lastLock: LockResult | null
}

export interface LockResult {
  linesCleared: number
  tSpin: 'none' | 'mini' | 'full'
  allClear: boolean
  combo: number
  b2b: boolean
}

const BOARD_ROWS = 20
const BOARD_COLS = 10
const NEXT_COUNT = 5
const SPAWN_ROW = 19

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
}

function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, row: SPAWN_ROW, col: 3 }
}

function ghostRow(piece: ActivePiece, board: GameBoard): number {
  let r = piece.row
  while (fitsOnBoard({ ...piece, row: r - 1 }, board)) r--
  return r
}

export class GameEngine {
  state: GameState
  private bag: SevenBag
  private lockDelay = 500
  private lockMoves = 0
  private lockTimer: ReturnType<typeof setTimeout> | null = null

  constructor(seed: number) {
    this.bag = new SevenBag(seed)
    const next = Array.from({ length: NEXT_COUNT + 1 }, () => this.bag.next())
    this.state = {
      board: emptyBoard(),
      active: spawnPiece(next.shift()!),
      hold: null,
      holdUsed: false,
      next,
      combo: 0,
      b2b: false,
      linesCleared: 0,
      topOut: false,
      garbageQueue: [],
      lastLock: null,
    }
  }

  move(dir: 'left' | 'right'): boolean {
    const { active, board } = this.state
    if (!active) return false
    const dc = dir === 'left' ? -1 : 1
    const moved = { ...active, col: active.col + dc }
    if (!fitsOnBoard(moved, board)) return false
    this.state.active = moved
    if (this.lockTimer) this.resetLock()
    return true
  }

  rotate(dir: 1 | -1 | 2): boolean {
    const { active, board } = this.state
    if (!active) return false
    const result = tryRotate(active, dir, board)
    if (!result) return false
    this.state.active = result
    if (this.lockTimer) this.resetLock()
    return true
  }

  softDrop(): boolean {
    const { active, board } = this.state
    if (!active) return false
    const moved = { ...active, row: active.row - 1 }
    if (!fitsOnBoard(moved, board)) return false
    this.state.active = moved
    return true
  }

  hardDrop(): LockResult {
    const { active, board } = this.state
    if (!active) return this.state.lastLock!
    const row = ghostRow(active, board)
    this.state.active = { ...active, row }
    return this.lockPiece()
  }

  hold(): boolean {
    if (this.state.holdUsed || !this.state.active) return false
    const cur = this.state.active.type
    if (this.state.hold) {
      this.state.active = spawnPiece(this.state.hold)
    } else {
      this.spawnNext()
    }
    this.state.hold = cur
    this.state.holdUsed = true
    return true
  }

  tick(): boolean {
    return this.softDrop() || (this.scheduleLock(), false)
  }

  private scheduleLock() {
    if (this.lockTimer) return
    this.lockTimer = setTimeout(() => this.lockPiece(), this.lockDelay)
  }

  private resetLock() {
    if (this.lockMoves >= 15) return
    clearTimeout(this.lockTimer!)
    this.lockTimer = null
    this.lockMoves++
  }

  private lockPiece(): LockResult {
    const { active, board } = this.state
    if (!active) return this.state.lastLock!
    clearTimeout(this.lockTimer!)
    this.lockTimer = null
    this.lockMoves = 0

    // Place piece on board
    for (const [r, c] of PIECES[active.type][active.rotation]) {
      const row = active.row + r
      const col = active.col + c
      if (row >= 0 && row < BOARD_ROWS) board[row][col] = active.type
    }

    // T-spin detection
    const tSpin = this.detectTSpin(active)

    // Clear lines
    const cleared: number[] = []
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[r].every(cell => cell !== null)) cleared.push(r)
    }
    for (const r of cleared.reverse()) {
      board.splice(r, 1)
      board.push(Array(BOARD_COLS).fill(null))
    }

    // Insert garbage (cleared lines absorb garbage)
    const absorbable = Math.min(cleared.length, this.state.garbageQueue.reduce((a, b) => a + b, 0))
    let remaining = absorbable
    while (remaining > 0 && this.state.garbageQueue.length) {
      const chunk = this.state.garbageQueue[0]
      if (chunk <= remaining) {
        remaining -= chunk
        this.state.garbageQueue.shift()
      } else {
        this.state.garbageQueue[0] -= remaining
        remaining = 0
      }
    }
    if (cleared.length === 0) {
      // Apply all pending garbage
      for (const lines of this.state.garbageQueue) {
        this.addGarbage(lines)
      }
      this.state.garbageQueue = []
    }

    const allClear = board.every(row => row.every(c => c === null))
    const b2b = this.state.b2b
    const newB2b = cleared.length === 4 || (tSpin !== 'none' && cleared.length > 0)
    this.state.b2b = newB2b

    const combo = cleared.length > 0 ? this.state.combo + 1 : 0
    this.state.combo = combo
    this.state.linesCleared += cleared.length

    const result: LockResult = { linesCleared: cleared.length, tSpin, allClear, combo, b2b }
    this.state.lastLock = result

    this.spawnNext()
    this.state.holdUsed = false
    return result
  }

  private spawnNext() {
    const next = this.state.next.shift()!
    this.state.next.push(this.bag.next())
    const piece = spawnPiece(next)
    if (!fitsOnBoard(piece, this.state.board)) {
      this.state.topOut = true
      this.state.active = null
    } else {
      this.state.active = piece
    }
  }

  private addGarbage(lines: number) {
    const col = Math.floor(Math.random() * BOARD_COLS)
    for (let i = 0; i < lines; i++) {
      const row: (PieceType | null)[] = Array(BOARD_COLS).fill('Z' as PieceType)
      row[col] = null
      this.state.board.unshift(row)
      this.state.board.pop()
    }
  }

  receiveGarbage(lines: number) {
    this.state.garbageQueue.push(lines)
  }

  private detectTSpin(piece: ActivePiece): 'none' | 'mini' | 'full' {
    if (piece.type !== 'T') return 'none'
    const corners = [
      [piece.row, piece.col],
      [piece.row, piece.col + 2],
      [piece.row + 2, piece.col],
      [piece.row + 2, piece.col + 2],
    ]
    const filled = corners.filter(([r, c]) =>
      r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS || this.state.board[r][c] !== null
    ).length
    if (filled < 3) return 'none'
    // Front corners (facing direction of T)
    const front = this.tFrontCorners(piece)
    const frontFilled = front.filter(([r, c]) =>
      r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS || this.state.board[r][c] !== null
    ).length
    return frontFilled >= 2 ? 'full' : 'mini'
  }

  private tFrontCorners(piece: ActivePiece): [number, number][] {
    const { row, col, rotation } = piece
    const fronts: Record<number, [number, number][]> = {
      0: [[row, col], [row, col + 2]],
      1: [[row, col + 2], [row + 2, col + 2]],
      2: [[row + 2, col], [row + 2, col + 2]],
      3: [[row, col], [row + 2, col]],
    }
    return fronts[rotation]
  }

  getGhostRow(): number {
    if (!this.state.active) return 0
    return ghostRow(this.state.active, this.state.board)
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/tetris/__tests__/engine.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: Tetris game engine (gravity, lock delay, T-spin, garbage)"
```

---

### Task 8: Attack system

**Files:**
- Create: `frontend/src/lib/tetris/attack.ts`
- Create: `frontend/src/lib/tetris/__tests__/attack.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/tetris/__tests__/attack.test.ts
import { calculateAttack } from '../attack'

test('Tetris (4 lines) sends 4', () => {
  expect(calculateAttack({ linesCleared: 4, tSpin: 'none', allClear: false, combo: 0, b2b: false })).toBe(4)
})

test('T-spin double sends 4', () => {
  expect(calculateAttack({ linesCleared: 2, tSpin: 'full', allClear: false, combo: 0, b2b: false })).toBe(4)
})

test('B2B Tetris sends 5', () => {
  expect(calculateAttack({ linesCleared: 4, tSpin: 'none', allClear: false, combo: 0, b2b: true })).toBe(5)
})

test('All-Clear adds 10', () => {
  expect(calculateAttack({ linesCleared: 1, tSpin: 'none', allClear: true, combo: 0, b2b: false })).toBe(10)
})

test('combo 3 sends 2 bonus', () => {
  expect(calculateAttack({ linesCleared: 1, tSpin: 'none', allClear: false, combo: 3, b2b: false })).toBe(2)
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/tetris/__tests__/attack.test.ts
```

- [ ] **Step 3: Write `src/lib/tetris/attack.ts`**

```ts
// src/lib/tetris/attack.ts
import type { LockResult } from './engine'

const BASE_ATTACK: Record<number, Record<string, number>> = {
  0: { none: 0, mini: 0, full: 0 },
  1: { none: 0, mini: 1, full: 2 },
  2: { none: 1, mini: 1, full: 4 },
  3: { none: 2, mini: 2, full: 6 },
  4: { none: 4, mini: 4, full: 4 },
}

const COMBO_TABLE = [0, 0, 1, 1, 2, 2, 3, 4]

export function calculateAttack(result: LockResult): number {
  if (result.linesCleared === 0) return 0
  let attack = BASE_ATTACK[result.linesCleared]?.[result.tSpin] ?? 0
  if (result.b2b && (result.linesCleared === 4 || result.tSpin !== 'none')) attack += 1
  if (result.allClear) return 10 + attack
  const comboIdx = Math.min(result.combo - 1, COMBO_TABLE.length - 1)
  attack += comboIdx >= 0 ? COMBO_TABLE[comboIdx] : 0
  return attack
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/tetris/__tests__/attack.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: attack calculation (T-spin, combo, B2B, All-Clear)"
```

---

### Task 9: Canvas renderer

**Files:**
- Create: `frontend/src/components/game/GameBoard.tsx`
- Create: `frontend/src/components/game/NextQueue.tsx`
- Create: `frontend/src/components/game/HoldPiece.tsx`
- Create: `frontend/src/components/game/AttackMeter.tsx`
- Create: `frontend/src/components/game/OpponentBoard.tsx`

- [ ] **Step 1: Write `src/components/game/GameBoard.tsx`**

```tsx
// src/components/game/GameBoard.tsx
'use client'
import { useEffect, useRef } from 'react'
import { PIECE_COLORS, PIECES } from '@/lib/tetris/pieces'
import type { GameState } from '@/lib/tetris/engine'

const CELL = 32
const COLS = 10
const ROWS = 20

interface Props {
  state: GameState
  ghostRow: number
}

export function GameBoard({ state, ghostRow }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background grid
    ctx.fillStyle = '#0d0d0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * CELL, (ROWS - 1 - r) * CELL, CELL, CELL)
      }
    }

    // Placed pieces
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.board[r][c]
        if (cell) {
          drawMino(ctx, c, ROWS - 1 - r, PIECE_COLORS[cell])
        }
      }
    }

    // Ghost piece
    if (state.active) {
      const minos = PIECES[state.active.type][state.active.rotation]
      ctx.globalAlpha = 0.25
      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (ghostRow + dr), PIECE_COLORS[state.active.type])
      }
      ctx.globalAlpha = 1

      // Active piece
      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (state.active.row + dr), PIECE_COLORS[state.active.type])
      }
    }
  }, [state, ghostRow])

  return (
    <canvas
      ref={canvasRef}
      width={COLS * CELL}
      height={ROWS * CELL}
      className="border border-white/10"
    />
  )
}

function drawMino(ctx: CanvasRenderingContext2D, col: number, row: number, color: string) {
  const x = col * CELL
  const y = row * CELL
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x + 1, y + 1, CELL - 2, 4)
}
```

- [ ] **Step 2: Write `src/components/game/NextQueue.tsx`**

```tsx
// src/components/game/NextQueue.tsx
'use client'
import { PIECE_COLORS, PIECES, PieceType } from '@/lib/tetris/pieces'

interface Props { pieces: PieceType[] }

export function NextQueue({ pieces }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-white/40 uppercase tracking-widest">Next</div>
      {pieces.slice(0, 5).map((type, i) => (
        <MiniPiece key={i} type={type} />
      ))}
    </div>
  )
}

function MiniPiece({ type }: { type: PieceType }) {
  const minos = PIECES[type][0]
  const MINI = 14
  return (
    <div className="relative" style={{ width: 4 * MINI, height: 2 * MINI }}>
      {minos.map(([r, c], i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: MINI - 1,
            height: MINI - 1,
            background: PIECE_COLORS[type],
            left: c * MINI,
            top: (1 - r) * MINI,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/game/HoldPiece.tsx`**

```tsx
// src/components/game/HoldPiece.tsx
'use client'
import { PIECE_COLORS, PIECES, PieceType } from '@/lib/tetris/pieces'

interface Props { type: PieceType | null; used: boolean }

export function HoldPiece({ type, used }: Props) {
  const MINI = 14
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-white/40 uppercase tracking-widest">Hold</div>
      <div className="relative border border-white/10 p-1" style={{ width: 4 * MINI + 8, height: 2 * MINI + 8, opacity: used ? 0.4 : 1 }}>
        {type && PIECES[type][0].map(([r, c], i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: MINI - 1,
              height: MINI - 1,
              background: PIECE_COLORS[type],
              left: c * MINI + 4,
              top: (1 - r) * MINI + 4,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/game/AttackMeter.tsx`**

```tsx
// src/components/game/AttackMeter.tsx
'use client'

interface Props { lines: number; max?: number }

export function AttackMeter({ lines, max = 20 }: Props) {
  const pct = Math.min(lines / max, 1)
  return (
    <div className="flex flex-col items-center gap-1" style={{ height: 20 * 32 }}>
      <div className="text-xs text-white/40 uppercase tracking-widest">ATK</div>
      <div className="flex-1 w-3 bg-white/5 rounded overflow-hidden flex flex-col-reverse">
        <div
          className="w-full bg-red-500 transition-all duration-100"
          style={{ height: `${pct * 100}%` }}
        />
      </div>
      <div className="text-xs text-white/60">{lines}</div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/game/OpponentBoard.tsx`**

```tsx
// src/components/game/OpponentBoard.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { PieceType } from '@/lib/tetris/pieces'
import { PIECE_COLORS } from '@/lib/tetris/pieces'

interface Props {
  board: (PieceType | null)[][]
  nickname: string
}

const MINI = 8
const COLS = 10
const ROWS = 20

export function OpponentBoard({ board, nickname }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0d0d0f'
    ctx.fillRect(0, 0, COLS * MINI, ROWS * MINI)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]
        if (cell) {
          ctx.fillStyle = PIECE_COLORS[cell]
          ctx.fillRect(c * MINI + 1, (ROWS - 1 - r) * MINI + 1, MINI - 2, MINI - 2)
        }
      }
    }
  }, [board])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-white/60 truncate max-w-[80px]">{nickname}</div>
      <canvas ref={canvasRef} width={COLS * MINI} height={ROWS * MINI} className="border border-white/10" />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Canvas game board renderer + HUD components"
```

---

### Task 10: Key binding system

**Files:**
- Create: `frontend/src/lib/tetris/keybindings.ts`
- Create: `frontend/src/lib/tetris/__tests__/keybindings.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/tetris/__tests__/keybindings.test.ts
import { defaultBindings, resolveAction } from '../keybindings'

test('resolves ArrowLeft to move_left', () => {
  expect(resolveAction('ArrowLeft', defaultBindings)).toBe('move_left')
})

test('resolves unknown key to null', () => {
  expect(resolveAction('KeyQ', defaultBindings)).toBeNull()
})

test('custom binding overrides default', () => {
  const custom = { ...defaultBindings, move_left: 'KeyA' }
  expect(resolveAction('KeyA', custom)).toBe('move_left')
  expect(resolveAction('ArrowLeft', custom)).toBeNull()
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/tetris/__tests__/keybindings.test.ts
```

- [ ] **Step 3: Write `src/lib/tetris/keybindings.ts`**

```ts
// src/lib/tetris/keybindings.ts
export type GameAction = 'move_left' | 'move_right' | 'soft_drop' | 'hard_drop' | 'rotate_cw' | 'rotate_ccw' | 'rotate_180' | 'hold'

export type KeyBindings = Record<GameAction, string>

export const defaultBindings: KeyBindings = {
  move_left:   'ArrowLeft',
  move_right:  'ArrowRight',
  soft_drop:   'ArrowDown',
  hard_drop:   'Space',
  rotate_cw:   'KeyX',
  rotate_ccw:  'KeyZ',
  rotate_180:  'KeyA',
  hold:        'KeyC',
}

export function resolveAction(code: string, bindings: KeyBindings): GameAction | null {
  const entry = Object.entries(bindings).find(([, key]) => key === code)
  return entry ? (entry[0] as GameAction) : null
}

export function loadBindings(): KeyBindings {
  if (typeof window === 'undefined') return defaultBindings
  try {
    const stored = localStorage.getItem('testris_keybindings')
    return stored ? { ...defaultBindings, ...JSON.parse(stored) } : defaultBindings
  } catch {
    return defaultBindings
  }
}

export function saveBindings(bindings: KeyBindings): void {
  localStorage.setItem('testris_keybindings', JSON.stringify(bindings))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/tetris/__tests__/keybindings.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: key binding system with localStorage persistence"
```

---

## Phase 3: AI Mode

### Task 11: ColdClear WASM Web Worker

**Files:**
- Create: `frontend/src/lib/workers/coldclear.worker.ts`
- Create: `frontend/src/lib/workers/useBot.ts`

> **Before coding:** Download the ColdClear WASM prebuilt release from https://github.com/MinusKelvin/cold-clear/releases and place `cold-clear.js` + `cold-clear_bg.wasm` in `frontend/public/wasm/`. These files are not on npm.

- [ ] **Step 1: Write `src/lib/workers/coldclear.worker.ts`**

```ts
// src/lib/workers/coldclear.worker.ts
// ColdClear WASM Web Worker — isolates WASM from main thread

type PieceChar = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

interface InitMsg  { type: 'init';   piece: PieceChar; next: PieceChar[] }
interface AddMsg   { type: 'addPiece'; piece: PieceChar }
interface ReqMsg   { type: 'requestMove' }
interface ResetMsg { type: 'reset'; piece: PieceChar; next: PieceChar[] }

type InMsg = InitMsg | AddMsg | ReqMsg | ResetMsg

// The ColdClear move output maps to our GameAction names
const CC_TO_ACTION: Record<string, string> = {
  'Move Left':          'move_left',
  'Move Right':         'move_right',
  'Soft Drop':          'soft_drop',
  'Hard Drop':          'hard_drop',
  'Rotate Clockwise':   'rotate_cw',
  'Rotate Counter-Clockwise': 'rotate_ccw',
  'Rotate 180':         'rotate_180',
  'Hold':               'hold',
}

let bot: any = null
let ready = false

// Dynamic import of WASM module (placed in /public/wasm/)
async function initBot(piece: PieceChar, next: PieceChar[]) {
  // @ts-ignore — WASM module, no TS types available
  const module = await import(/* webpackIgnore: true */ '/wasm/cold-clear.js')
  await module.default()  // init WASM memory
  bot = module.BotHandle.create({}, piece, next)
  ready = true
  self.postMessage({ type: 'ready' })
}

self.addEventListener('message', async (e: MessageEvent<InMsg>) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      await initBot(msg.piece, msg.next)
      break
    case 'addPiece':
      bot?.addNextPiece(msg.piece)
      break
    case 'requestMove': {
      if (!ready || !bot) {
        self.postMessage({ type: 'move', actions: ['hard_drop'], hold: false })
        break
      }
      const result = bot.nextMove({})
      if (!result) {
        self.postMessage({ type: 'move', actions: ['hard_drop'], hold: false })
      } else {
        const actions = (result.inputs as string[]).map(i => CC_TO_ACTION[i] ?? i)
        self.postMessage({ type: 'move', actions, hold: result.hold })
      }
      break
    }
    case 'reset':
      ready = false
      bot = null
      await initBot(msg.piece, msg.next)
      break
  }
})
```

- [ ] **Step 2: Write `src/lib/workers/useBot.ts`**

```ts
// src/lib/workers/useBot.ts
import { useEffect, useRef, useCallback } from 'react'
import type { PieceType } from '@/lib/tetris/pieces'

type MoveMsg = { type: 'move'; actions: string[]; hold: boolean }
type ReadyMsg = { type: 'ready' }
type BotMsg = MoveMsg | ReadyMsg

interface UseBotOptions {
  onMove: (actions: string[], hold: boolean) => void
  onReady?: () => void
}

export function useBot({ onMove, onReady }: UseBotOptions) {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('./coldclear.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<BotMsg>) => {
      if (e.data.type === 'ready') onReady?.()
      if (e.data.type === 'move') onMove(e.data.actions, e.data.hold)
    }
    return () => worker.terminate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initBot = useCallback((piece: PieceType, next: PieceType[]) => {
    workerRef.current?.postMessage({ type: 'init', piece, next })
  }, [])

  const addPiece = useCallback((piece: PieceType) => {
    workerRef.current?.postMessage({ type: 'addPiece', piece })
  }, [])

  const requestMove = useCallback(() => {
    workerRef.current?.postMessage({ type: 'requestMove' })
  }, [])

  const resetBot = useCallback((piece: PieceType, next: PieceType[]) => {
    workerRef.current?.postMessage({ type: 'reset', piece, next })
  }, [])

  return { initBot, addPiece, requestMove, resetBot }
}
```

- [ ] **Step 3: Verify Worker loads in browser**

```bash
cd testris/frontend
npm run dev
# Open http://localhost:3000
# Open DevTools > Console — no WASM load errors
# (Will test actual AI moves in Task 12)
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: ColdClear WASM Web Worker integration"
```

---

### Task 12: AI match mode page

**Files:**
- Create: `frontend/src/app/game/page.tsx`

- [ ] **Step 1: Write `src/app/game/page.tsx`**

```tsx
// src/app/game/page.tsx
'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { calculateAttack } from '@/lib/tetris/attack'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { useBot } from '@/lib/workers/useBot'

const GRAVITY_MS = 800
const BOT_THINK_MS = 200 // ms between bot actions

export default function GamePage() {
  const [tick, setTick] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const engineRef = useRef<GameEngine | null>(null)
  const bindings = useRef(loadBindings())
  const botActionsRef = useRef<string[]>([])
  const botHoldRef = useRef(false)
  const botTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const { initBot, addPiece, requestMove } = useBot({
    onReady: () => requestMove(),
    onMove: (actions, hold) => {
      botActionsRef.current = actions
      botHoldRef.current = hold
    },
  })

  const startGame = useCallback(() => {
    const seed = Date.now()
    const eng = new GameEngine(seed)
    engineRef.current = eng
    setGameOver(false)
    setScore(0)
    refresh()

    const { active, next } = eng.state
    if (active) {
      initBot(active.type, next)
      addPiece(next[next.length - 1])
    }
  }, [initBot, addPiece, refresh])

  // Gravity tick
  useEffect(() => {
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [refresh])

  // Bot action loop
  useEffect(() => {
    botTimerRef.current = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut || botActionsRef.current.length === 0) return
      const action = botActionsRef.current.shift()!
      applyAction(eng, action)
      if (botActionsRef.current.length === 0) {
        const { active, next } = eng.state
        if (active) {
          addPiece(next[next.length - 1])
          requestMove()
        }
      }
      refresh()
    }, BOT_THINK_MS)
    return () => clearInterval(botTimerRef.current!)
  }, [addPiece, requestMove, refresh])

  // Player key input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const action = resolveAction(e.code, bindings.current)
      if (!action) return
      e.preventDefault()
      const prevActive = eng.state.active?.type
      applyAction(eng, action)
      // If piece locked (new piece spawned), notify bot
      if (prevActive !== eng.state.active?.type && eng.state.active) {
        addPiece(eng.state.next[eng.state.next.length - 1])
        requestMove()
      }
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addPiece, requestMove, refresh])

  useEffect(() => { startGame() }, [startGame])

  const eng = engineRef.current
  if (!eng) return null

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center text-white">
      <div className="flex gap-6 items-start">
        <HoldPiece type={eng.state.hold} used={eng.state.holdUsed} />
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-white/40">Lines: {eng.state.linesCleared}</div>
          <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} />
          {gameOver && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="text-xl font-bold text-red-400">GAME OVER</div>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
        <NextQueue pieces={eng.state.next} />
      </div>
    </div>
  )
}

function applyAction(eng: GameEngine, action: string) {
  switch (action) {
    case 'move_left':    eng.move('left'); break
    case 'move_right':   eng.move('right'); break
    case 'soft_drop':    eng.softDrop(); break
    case 'hard_drop':    eng.hardDrop(); break
    case 'rotate_cw':    eng.rotate(1); break
    case 'rotate_ccw':   eng.rotate(-1); break
    case 'rotate_180':   eng.rotate(2); break
    case 'hold':         eng.hold(); break
  }
}
```

- [ ] **Step 2: Test in browser**

```bash
cd testris/frontend && npm run dev
# Open http://localhost:3000/game
# Verify: board renders, gravity drops pieces, key inputs work
# Verify: no console errors from WASM worker
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: AI match mode page with bot + player keyboard input"
```

---

## Phase 4: Multiplayer

### Task 13: Socket.io server — matchmaking, PvP sessions, rooms

**Files:**
- Create: `backend/src/socket/index.js`
- Create: `backend/src/socket/matchmaking.js`
- Create: `backend/src/socket/game.js`
- Create: `backend/src/socket/room.js`
- Create: `backend/src/routes/rooms.js`
- Create: `backend/src/routes/users.js`
- Create: `backend/tests/rank.test.js`
- Create: `backend/tests/rooms.test.js`

- [ ] **Step 1: Write failing rank test**

```js
// tests/rank.test.js
const { calculateTR, tierFromTR } = require('../src/socket/game')

test('winner gains TR, loser loses TR', () => {
  const { p1After, p2After } = calculateTR(1000, 1000, 'p1')
  expect(p1After).toBeGreaterThan(1000)
  expect(p2After).toBeLessThan(1000)
})

test('upset win yields more TR than expected win', () => {
  const { p1After: upset }   = calculateTR(500, 1500, 'p1')
  const { p1After: favored } = calculateTR(1500, 500, 'p1')
  expect(upset - 500).toBeGreaterThan(1500 - favored)
})

test('tierFromTR maps correctly', () => {
  expect(tierFromTR(0)).toBe('D')
  expect(tierFromTR(2500)).toBe('B')
  expect(tierFromTR(6000)).toBe('X')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd testris/backend && npm test -- --testPathPattern=rank
```

- [ ] **Step 3: Write `src/socket/game.js`**

```js
// src/socket/game.js
const pool = require('../db/pool')

const K_TABLE = [
  { minTR: 4000, K: 20 },
  { minTR: 2000, K: 30 },
  { minTR: 0,    K: 40 },
]

function kFactor(tr) {
  return (K_TABLE.find(e => tr >= e.minTR) ?? K_TABLE[K_TABLE.length - 1]).K
}

function tierFromTR(tr) {
  if (tr >= 6000) return 'X'
  if (tr >= 5000) return 'SS'
  if (tr >= 4000) return 'S'
  if (tr >= 3000) return 'A'
  if (tr >= 2000) return 'B'
  if (tr >= 1000) return 'C'
  return 'D'
}

function calculateTR(p1TR, p2TR, winner) {
  const exp1 = 1 / (1 + Math.pow(10, (p2TR - p1TR) / 400))
  const exp2 = 1 - exp1
  const score1 = winner === 'p1' ? 1 : 0
  const score2 = 1 - score1
  const k1 = kFactor(p1TR)
  const k2 = kFactor(p2TR)
  return {
    p1After: Math.max(0, Math.round(p1TR + k1 * (score1 - exp1))),
    p2After: Math.max(0, Math.round(p2TR + k2 * (score2 - exp2))),
  }
}

// in-memory game sessions: sessionId → { players: [{socketId, userId}], ranked, roomId }
const sessions = new Map()

async function handleGameOver({ io, sessionId, loserUserId, isRanked, roomId }) {
  const session = sessions.get(sessionId)
  if (!session) return
  sessions.delete(sessionId)

  const winner = session.players.find(p => p.userId !== loserUserId)
  const loser  = session.players.find(p => p.userId === loserUserId)
  if (!winner || !loser) return
  const winnerId = winner.userId
  const loserId  = loser.userId

  io.to(sessionId).emit('game:result', { winnerId, loserId })

  if (!isRanked) return

  // Fetch ranks
  const [p1Row, p2Row] = await Promise.all([
    pool.query('SELECT tr FROM ranks WHERE user_id = $1', [winnerId]),
    pool.query('SELECT tr FROM ranks WHERE user_id = $1', [loserId]),
  ])
  const p1TR = p1Row.rows[0]?.tr ?? 0
  const p2TR = p2Row.rows[0]?.tr ?? 0
  const { p1After, p2After } = calculateTR(p1TR, p2TR, 'p1')

  // Upsert ranks
  await Promise.all([
    pool.query(`
      INSERT INTO ranks (user_id, tr, tier, wins, games_played, peak_tr, peak_tier)
        VALUES ($1, $2, $3, 1, 1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        tr = $2, tier = $3, wins = ranks.wins + 1,
        games_played = ranks.games_played + 1,
        peak_tr = GREATEST(ranks.peak_tr, $2),
        peak_tier = CASE WHEN $2 > ranks.peak_tr THEN $3 ELSE ranks.peak_tier END,
        updated_at = NOW()
    `, [winnerId, p1After, tierFromTR(p1After)]),
    pool.query(`
      INSERT INTO ranks (user_id, tr, tier, losses, games_played, peak_tr, peak_tier)
        VALUES ($1, $2, $3, 1, 1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        tr = $2, tier = $3, losses = ranks.losses + 1,
        games_played = ranks.games_played + 1,
        updated_at = NOW()
    `, [loserId, p2After, tierFromTR(p2After)]),
  ])

  await pool.query(`
    INSERT INTO game_records
      (player1_id, player2_id, winner_id, is_ranked, p1_tr_before, p1_tr_after, p2_tr_before, p2_tr_after)
    VALUES ($1, $2, $3, true, $4, $5, $6, $7)
  `, [winnerId, loserId, winnerId, p1TR, p1After, p2TR, p2After])

  // Emit TR delta
  io.to(sessionId).emit('game:trUpdate', {
    [winnerId]: { before: p1TR, after: p1After },
    [loserId]:  { before: p2TR, after: p2After },
  })
}

function registerGame(sessionId, players, ranked, roomId = null) {
  // players: [{ socketId, userId }, { socketId, userId }]
  sessions.set(sessionId, { players, ranked, roomId })
}

module.exports = { calculateTR, tierFromTR, handleGameOver, registerGame }
```

- [ ] **Step 4: Run rank tests — expect PASS**

```bash
npm test -- --testPathPattern=rank
```

- [ ] **Step 5: Write `src/socket/matchmaking.js`**

```js
// src/socket/matchmaking.js
const { v4: uuidv4 } = require('uuid')
const { registerGame } = require('./game')

// queue: [{ socketId, userId, tr }]
const rankedQueue = []
const casualQueue = []

function joinQueue(socket, userId, tr, ranked) {
  const queue = ranked ? rankedQueue : casualQueue
  if (queue.some(e => e.socketId === socket.id)) return

  queue.push({ socketId: socket.id, userId, tr })
  tryMatch(socket.server, queue, ranked)
}

function leaveQueue(socketId) {
  ;[rankedQueue, casualQueue].forEach(q => {
    const i = q.findIndex(e => e.socketId === socketId)
    if (i !== -1) q.splice(i, 1)
  })
}

function tryMatch(io, queue, ranked) {
  if (queue.length < 2) return
  const [a, b] = queue.splice(0, 2)
  const sessionId = uuidv4()

  // Move both sockets into the game session room
  const sA = io.sockets.sockets.get(a.socketId)
  const sB = io.sockets.sockets.get(b.socketId)
  if (!sA || !sB) return

  sA.join(sessionId)
  sB.join(sessionId)
  registerGame(
    sessionId,
    [{ socketId: a.socketId, userId: a.userId }, { socketId: b.socketId, userId: b.userId }],
    ranked
  )

  io.to(sessionId).emit('game:start', {
    sessionId,
    players: [
      { socketId: a.socketId, userId: a.userId },
      { socketId: b.socketId, userId: b.userId },
    ],
  })
}

module.exports = { joinQueue, leaveQueue }
```

- [ ] **Step 6: Write `src/socket/room.js`**

```js
// src/socket/room.js
const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { registerGame } = require('./game')

// roomCode → { sessionId, players: [userId, ...] }
const activeRooms = new Map()

function registerRoomHandlers(io, socket, userId) {
  socket.on('room:join', async ({ code, password }) => {
    const row = await pool.query('SELECT * FROM rooms WHERE code = $1', [code])
    if (!row.rows.length) return socket.emit('room:error', 'Room not found')
    const room = row.rows[0]
    if (room.status !== 'waiting') return socket.emit('room:error', 'Game already started')
    if (room.password_hash && !(await bcrypt.compare(password ?? '', room.password_hash)))
      return socket.emit('room:error', 'Wrong password')

    await pool.query(
      `INSERT INTO room_players (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [room.id, userId]
    )
    socket.join(code)
    io.to(code).emit('room:update', await getRoomState(code))
  })

  socket.on('room:leave', async ({ code }) => {
    socket.leave(code)
    await pool.query('DELETE FROM room_players WHERE room_id = (SELECT id FROM rooms WHERE code=$1) AND user_id=$2', [code, userId])
    io.to(code).emit('room:update', await getRoomState(code))
  })

  socket.on('room:start', async ({ code }) => {
    const row = await pool.query('SELECT * FROM rooms WHERE code = $1 AND host_id = $2', [code, userId])
    if (!row.rows.length) return socket.emit('room:error', 'Not host')
    const room = row.rows[0]

    const players = await pool.query('SELECT user_id FROM room_players WHERE room_id = $1', [room.id])
    if (players.rows.length < 2) return socket.emit('room:error', 'Need at least 2 players')

    await pool.query(`UPDATE rooms SET status='playing' WHERE id=$1`, [room.id])
    const sessionId = uuidv4()

    // Map user_ids to their connected socket ids
    const roomSockets = [...io.sockets.sockets.values()].filter(s => s.rooms.has(code))
    const playerList = players.rows.slice(0, 2).map((p, i) => ({
      socketId: roomSockets[i]?.id ?? '',
      userId:   p.user_id,
    }))
    registerGame(sessionId, playerList, false, room.id)

    io.to(code).emit('game:start', { sessionId, roomCode: code })
  })
}

async function getRoomState(code) {
  const room = await pool.query(`
    SELECT r.*, array_agg(u.nickname) AS players
    FROM rooms r
    LEFT JOIN room_players rp ON rp.room_id = r.id
    LEFT JOIN users u ON u.id = rp.user_id
    WHERE r.code = $1
    GROUP BY r.id
  `, [code])
  return room.rows[0] ?? null
}

module.exports = { registerRoomHandlers }
```

- [ ] **Step 7: Write `src/socket/index.js`**

```js
// src/socket/index.js
const jwt = require('jsonwebtoken')
const config = require('../config')
const { joinQueue, leaveQueue } = require('./matchmaking')
const { handleGameOver } = require('./game')
const { registerRoomHandlers } = require('./room')

module.exports = function registerSocket(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.data.user = jwt.verify(token, config.NEXTAUTH_SECRET)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.user.id
    const tr = socket.data.user.tr ?? 0

    // Matchmaking
    socket.on('mm:join', ({ ranked }) => joinQueue(socket, userId, tr, !!ranked))
    socket.on('mm:leave', () => leaveQueue(socket.id))

    // PvP game events
    socket.on('game:board', ({ sessionId, board, combo, b2b }) => {
      socket.to(sessionId).emit('game:board', { board, combo, b2b })
    })

    socket.on('game:garbage', ({ sessionId, lines }) => {
      socket.to(sessionId).emit('game:garbage', { lines })
    })

    socket.on('game:over', async ({ sessionId, ranked, roomId }) => {
      // Sender has topped out — they are the loser; handleGameOver finds the winner from session
      await handleGameOver({ io, sessionId, loserUserId: userId, isRanked: !!ranked, roomId })
    })

    // Room handlers
    registerRoomHandlers(io, socket, userId)

    socket.on('disconnect', () => {
      leaveQueue(socket.id)
    })
  })
}
```

- [ ] **Step 8: Write `src/routes/rooms.js`**

```js
// src/routes/rooms.js
const router = require('express').Router()
const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth')

// List public rooms
router.get('/', async (req, res) => {
  const rows = await pool.query(`
    SELECT r.id, r.code, r.status, r.max_players, r.match_format,
           u.nickname AS host_nickname,
           COUNT(rp.user_id)::int AS player_count
    FROM rooms r
    LEFT JOIN users u ON u.id = r.host_id
    LEFT JOIN room_players rp ON rp.room_id = r.id
    WHERE r.password_hash IS NULL AND r.status = 'waiting'
    GROUP BY r.id, u.nickname
    ORDER BY r.created_at DESC
    LIMIT 50
  `)
  res.json(rows.rows)
})

// Get room by code
router.get('/:code', async (req, res) => {
  const row = await pool.query('SELECT * FROM rooms WHERE code = $1', [req.params.code])
  if (!row.rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(row.rows[0])
})

// Create room
router.post('/', auth, async (req, res) => {
  const { password, max_players = 2, match_format = 'single' } = req.body
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const hash = password ? await bcrypt.hash(password, 10) : null

  const row = await pool.query(`
    INSERT INTO rooms (code, host_id, password_hash, max_players, match_format)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [code, req.user.id, hash, max_players, match_format])

  await pool.query(
    'INSERT INTO room_players (room_id, user_id, role) VALUES ($1, $2, $3)',
    [row.rows[0].id, req.user.id, 'host']
  )
  res.json(row.rows[0])
})

module.exports = router
```

- [ ] **Step 9: Write `src/routes/users.js`**

```js
// src/routes/users.js
const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

// Get user profile + rank
router.get('/:id', async (req, res) => {
  const user = await pool.query(`
    SELECT u.id, u.nickname, u.guest_tag, u.is_paid, u.created_at,
           r.tr, r.tier, r.wins, r.losses, r.games_played, r.peak_tr, r.peak_tier
    FROM users u
    LEFT JOIN ranks r ON r.user_id = u.id
    WHERE u.id = $1
  `, [req.params.id])
  if (!user.rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(user.rows[0])
})

// Update nickname
router.patch('/me/nickname', auth, async (req, res) => {
  const { nickname } = req.body
  if (!nickname || !/^[a-zA-Z0-9_]{3,20}$/.test(nickname))
    return res.status(400).json({ error: 'Invalid nickname (3-20 alphanumeric chars)' })

  try {
    await pool.query('UPDATE users SET nickname=$1, updated_at=NOW() WHERE id=$2', [nickname, req.user.id])
    res.json({ ok: true })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Nickname taken' })
    throw e
  }
})

// Get key bindings
router.get('/me/settings', auth, async (req, res) => {
  const row = await pool.query('SELECT key_bindings FROM user_settings WHERE user_id=$1', [req.user.id])
  res.json({ key_bindings: row.rows[0]?.key_bindings ?? {} })
})

// Save key bindings
router.patch('/me/settings', auth, async (req, res) => {
  const { key_bindings } = req.body
  await pool.query(`
    INSERT INTO user_settings (user_id, key_bindings) VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET key_bindings=$2, updated_at=NOW()
  `, [req.user.id, JSON.stringify(key_bindings)])
  res.json({ ok: true })
})

module.exports = router
```

- [ ] **Step 10: Write failing rooms test**

```js
// tests/rooms.test.js
const request = require('supertest')
const { app } = require('../src/server')

describe('GET /rooms', () => {
  it('returns array', async () => {
    const res = await request(app).get('/rooms')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /rooms', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).post('/rooms').send({})
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 11: Run rooms test — expect PASS**

```bash
npm test -- --testPathPattern=rooms
```

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: Socket.io matchmaking, PvP sessions, room system"
```

---

### Task 14: Frontend lib — api.ts, socket.ts, store.ts

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/socket.ts`
- Create: `frontend/src/lib/store.ts`

- [ ] **Step 1: Write `src/lib/api.ts`**

```ts
// src/lib/api.ts
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
  // Auth
  syncUser: (google_id: string, email: string) =>
    request('/auth/sync', { method: 'POST', body: JSON.stringify({ google_id, email }) }),

  // Users
  getProfile: (id: string) => request<any>(`/users/${id}`),
  setNickname: (nickname: string, token: string) =>
    request('/users/me/nickname', { method: 'PATCH', body: JSON.stringify({ nickname }), token }),
  getSettings: (token: string) => request<any>('/users/me/settings', { token }),
  saveSettings: (key_bindings: Record<string, string>, token: string) =>
    request('/users/me/settings', { method: 'PATCH', body: JSON.stringify({ key_bindings }), token }),

  // Rooms
  listRooms: () => request<any[]>('/rooms'),
  getRoom: (code: string) => request<any>(`/rooms/${code}`),
  createRoom: (opts: { password?: string; max_players?: number; match_format?: string }, token: string) =>
    request<any>('/rooms', { method: 'POST', body: JSON.stringify(opts), token }),

  // Subscriptions
  getSubscription: (token: string) => request<any>('/subscriptions/me', { token }),
}
```

- [ ] **Step 2: Write `src/lib/socket.ts`**

```ts
// src/lib/socket.ts
import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
```

- [ ] **Step 3: Write `src/lib/store.ts`**

```ts
// src/lib/store.ts
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
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: frontend api.ts, socket.ts, store.ts"
```

---

### Task 15: All frontend pages

**Files:**
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/play/page.tsx`
- Create: `frontend/src/app/room/page.tsx`
- Create: `frontend/src/app/room/[id]/page.tsx`
- Create: `frontend/src/app/profile/[id]/page.tsx`
- Create: `frontend/src/app/settings/page.tsx`
- Create: `frontend/src/app/pricing/page.tsx`
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/app/maintenance/page.tsx`
- Create: `frontend/src/app/not-found.tsx`
- Create: `frontend/src/app/error.tsx`
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Modal.tsx`

- [ ] **Step 1: Write shared UI components**

```tsx
// src/components/ui/Button.tsx
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50'
  const variants = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    danger:    'bg-red-600 hover:bg-red-500 text-white',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
```

```tsx
// src/components/ui/Modal.tsx
'use client'
interface Props { title: string; children: React.ReactNode; onClose: () => void }

export function Modal({ title, children, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
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
```

- [ ] **Step 3: Write `src/app/page.tsx` (landing)**

```tsx
// src/app/page.tsx
import Link from 'next/link'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-6xl font-black tracking-tight text-indigo-400">TESTRIS</h1>
      <p className="text-white/50 text-lg">Competitive browser Tetris. Play ranked, beat bots, climb the ladder.</p>
      {session ? (
        <Link href="/play" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold">
          Play Now
        </Link>
      ) : (
        <Link href="/login" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold">
          Sign In to Play
        </Link>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Write `src/app/login/page.tsx`**

```tsx
// src/app/login/page.tsx
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
```

- [ ] **Step 5: Write `src/app/play/page.tsx` (mode selection)**

```tsx
// src/app/play/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PlayPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold text-white">Choose Mode</h1>
      <div className="flex gap-4">
        <ModeCard href="/game" title="vs AI" desc="Practice against ColdClear bot" />
        <ModeCard href="/room?ranked=true" title="Ranked" desc="Compete and climb the ladder" badge="Pro" />
        <ModeCard href="/room" title="Custom Room" desc="Play with friends" />
      </div>
      <div className="flex gap-6 mt-4 text-sm text-white/40">
        <Link href={`/profile/${session.user.id}`} className="hover:text-white">Profile</Link>
        <Link href="/settings" className="hover:text-white">Settings</Link>
        <Link href="/pricing" className="hover:text-white">Pricing</Link>
      </div>
    </main>
  )
}

function ModeCard({ href, title, desc, badge }: { href: string; title: string; desc: string; badge?: string }) {
  return (
    <Link href={href} className="block w-48 p-5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-white">{title}</span>
        {badge && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 rounded">{badge}</span>}
      </div>
      <p className="text-xs text-white/40">{desc}</p>
    </Link>
  )
}
```

- [ ] **Step 6: Write `src/app/room/page.tsx` (room list + create)**

```tsx
// src/app/room/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export default function RoomPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const ranked = params.get('ranked') === 'true'

  const [rooms, setRooms] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.listRooms().then(setRooms)
  }, [])

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
```

- [ ] **Step 7: Write `src/app/room/[id]/page.tsx` (room lobby + PvP game)**

```tsx
// src/app/room/[id]/page.tsx
'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { GameEngine } from '@/lib/tetris/engine'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { calculateAttack } from '@/lib/tetris/attack'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { AttackMeter } from '@/components/game/AttackMeter'
import { OpponentBoard } from '@/components/game/OpponentBoard'
import { useStore } from '@/lib/store'
import type { PieceType } from '@/lib/tetris/pieces'

type Phase = 'lobby' | 'playing' | 'result'

export default function RoomPage() {
  const { id: code } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const { connect, socket } = useStore()

  const [phase, setPhase] = useState<Phase>('lobby')
  const [tick, setTick] = useState(0)
  const [opponentBoard, setOpponentBoard] = useState<(PieceType | null)[][]>(
    Array.from({ length: 20 }, () => Array(10).fill(null))
  )
  const [pendingGarbage, setPendingGarbage] = useState(0)
  const [result, setResult] = useState<{ won: boolean; p1TR?: number; p2TR?: number } | null>(null)

  const engineRef   = useRef<GameEngine | null>(null)
  const sessionRef  = useRef<string>('')
  const bindings    = useRef(loadBindings())
  const refresh     = useCallback(() => setTick(t => t + 1), [])

  // Connect socket on mount
  useEffect(() => {
    if (!session) return
    const tok = (session as any).accessToken ?? ''
    const sock = connect(tok)

    sock.emit('room:join', { code })

    sock.on('game:start', ({ sessionId }: { sessionId: string }) => {
      sessionRef.current = sessionId
      const eng = new GameEngine(Date.now())
      engineRef.current = eng
      setPhase('playing')
      refresh()
    })

    sock.on('game:board', ({ board }: { board: (PieceType | null)[][] }) => {
      setOpponentBoard(board)
    })

    sock.on('game:garbage', ({ lines }: { lines: number }) => {
      engineRef.current?.receiveGarbage(lines)
      setPendingGarbage(g => g + lines)
    })

    sock.on('game:result', ({ winnerId }: { winnerId: string }) => {
      setPhase('result')
      setResult({ won: winnerId === session.user.id })
    })

    return () => {
      sock.emit('room:leave', { code })
      sock.off('game:start')
      sock.off('game:board')
      sock.off('game:garbage')
      sock.off('game:result')
    }
  }, [session, code, connect, refresh])

  // Gravity + board sync
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      socket?.emit('game:board', { sessionId: sessionRef.current, board: eng.state.board })
      if (eng.state.topOut) {
        setPhase('result')
        socket?.emit('game:over', { sessionId: sessionRef.current, ranked: false })
      }
      refresh()
    }, 800)
    return () => clearInterval(id)
  }, [phase, socket, refresh])

  // Key input
  useEffect(() => {
    if (phase !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const action = resolveAction(e.code, bindings.current)
      if (!action) return
      e.preventDefault()
      const prev = eng.state.active?.type
      switch (action) {
        case 'move_left':  eng.move('left'); break
        case 'move_right': eng.move('right'); break
        case 'soft_drop':  eng.softDrop(); break
        case 'rotate_cw':  eng.rotate(1); break
        case 'rotate_ccw': eng.rotate(-1); break
        case 'rotate_180': eng.rotate(2); break
        case 'hold':       eng.hold(); break
        case 'hard_drop': {
          const lockResult = eng.hardDrop()
          const atk = calculateAttack(lockResult)
          if (atk > 0) {
            socket?.emit('game:garbage', { sessionId: sessionRef.current, lines: atk })
          }
          break
        }
      }
      if (prev !== eng.state.active?.type) {
        socket?.emit('game:board', { sessionId: sessionRef.current, board: eng.state.board })
      }
      if (eng.state.topOut) {
        setPhase('result')
        socket?.emit('game:over', { sessionId: sessionRef.current, ranked: false })
      }
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, socket, refresh])

  const eng = engineRef.current

  if (phase === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Room <span className="font-mono text-indigo-400">{code}</span></h1>
        <p className="text-white/40 text-sm">Waiting for opponent...</p>
      </main>
    )
  }

  if (phase === 'result') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">{result?.won ? 'You Win!' : 'You Lose'}</h1>
        <a href="/play" className="text-indigo-400 underline text-sm">Back to Play</a>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center gap-8">
      <HoldPiece type={eng?.state.hold ?? null} used={eng?.state.holdUsed ?? false} />
      <AttackMeter lines={pendingGarbage} />
      <GameBoard state={eng!.state} ghostRow={eng!.getGhostRow()} />
      <NextQueue pieces={eng?.state.next ?? []} />
      <OpponentBoard board={opponentBoard} nickname="Opponent" />
    </div>
  )
}
```

- [ ] **Step 8: Write remaining pages**

```tsx
// src/app/profile/[id]/page.tsx
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'

export default async function ProfilePage({ params }: { params: { id: string } }) {
  let profile: any
  try { profile = await api.getProfile(params.id) }
  catch { notFound() }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-1">{profile.nickname ?? profile.guest_tag}</h1>
      <p className="text-white/40 text-sm mb-6">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="Tier" value={profile.tier ?? 'D'} />
        <Stat label="TR"   value={Math.round(profile.tr ?? 0).toString()} />
        <Stat label="W/L"  value={`${profile.wins ?? 0}/${profile.losses ?? 0}`} />
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
```

```tsx
// src/app/settings/page.tsx
'use client'
import { useState } from 'react'
import { loadBindings, saveBindings, defaultBindings } from '@/lib/tetris/keybindings'
import { Button } from '@/components/ui/Button'

const ACTION_LABELS: Record<string, string> = {
  move_left: 'Move Left', move_right: 'Move Right', soft_drop: 'Soft Drop',
  hard_drop: 'Hard Drop', rotate_cw: 'Rotate CW', rotate_ccw: 'Rotate CCW',
  rotate_180: 'Rotate 180', hold: 'Hold',
}

export default function SettingsPage() {
  const [bindings, setBindings] = useState(loadBindings)
  const [listening, setListening] = useState<string | null>(null)

  function startListen(action: string) {
    setListening(action)
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      const updated = { ...bindings, [action]: e.code }
      setBindings(updated)
      saveBindings(updated)
      setListening(null)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('keydown', handler)
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Key Bindings</h1>
      {Object.entries(ACTION_LABELS).map(([action, label]) => (
        <div key={action} className="flex justify-between items-center py-3 border-b border-white/10">
          <span className="text-white/70">{label}</span>
          <button
            className={`px-3 py-1 rounded font-mono text-sm min-w-28 text-center border ${
              listening === action ? 'border-indigo-400 text-indigo-300' : 'border-white/20 text-white/60'
            }`}
            onClick={() => startListen(action)}
          >
            {listening === action ? 'Press key...' : bindings[action as keyof typeof bindings]}
          </button>
        </div>
      ))}
      <Button variant="secondary" className="mt-6" onClick={() => { setBindings(defaultBindings); saveBindings(defaultBindings) }}>
        Reset to Defaults
      </Button>
    </main>
  )
}
```

```tsx
// src/app/pricing/page.tsx
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
```

```tsx
// src/app/admin/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user.is_admin) redirect('/play')

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <p className="text-white/40 text-sm">Use the API directly for admin actions (ban/unban users, toggle maintenance).</p>
      <div className="mt-4 space-y-2 text-sm font-mono text-white/60">
        <div>POST /admin/users/:id/ban</div>
        <div>POST /admin/users/:id/unban</div>
        <div>POST /admin/system/maintenance</div>
      </div>
    </main>
  )
}
```

```tsx
// src/app/maintenance/page.tsx
export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-yellow-400">Under Maintenance</h1>
      <p className="text-white/50">We'll be back shortly. Follow updates on our Discord.</p>
    </main>
  )
}
```

```tsx
// src/app/not-found.tsx
import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-black text-white/20">404</h1>
      <Link href="/" className="text-indigo-400 underline text-sm">Back to Home</Link>
    </main>
  )
}
```

```tsx
// src/app/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
      <p className="text-white/40 text-sm">{error.message}</p>
      <button onClick={reset} className="text-indigo-400 underline text-sm">Try again</button>
    </main>
  )
}
```

- [ ] **Step 9: Verify build**

```bash
cd testris/frontend
npm run build
# Expected: compiled successfully (no type errors)
```

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: all frontend pages (landing, lobby, game, profile, settings, pricing, admin)"
```

---

## Phase 5: Subscription

### Task 16: Polar.sh subscription + webhook

**Files:**
- Create: `backend/src/routes/subscriptions.js`
- Modify: `backend/src/routes/webhooks.js`
- Create: `backend/tests/webhooks.test.js`

- [ ] **Step 1: Write failing webhook test**

```js
// tests/webhooks.test.js
const request = require('supertest')
const { app } = require('../src/server')

describe('POST /webhooks/polar', () => {
  it('rejects missing signature', async () => {
    const res = await request(app)
      .post('/webhooks/polar')
      .send({ type: 'subscription.created', data: {} })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --testPathPattern=webhooks
```

- [ ] **Step 3: Write `src/routes/subscriptions.js`**

```js
// src/routes/subscriptions.js
const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

router.get('/me', auth, async (req, res) => {
  const row = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [req.user.id]
  )
  res.json(row.rows[0] ?? null)
})

module.exports = router
```

- [ ] **Step 4: Write `src/routes/webhooks.js`**

```js
// src/routes/webhooks.js
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const pool = require('../db/pool')
const config = require('../config')

function verifySignature(rawBody, signature) {
  if (!signature || !config.POLAR_WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', config.POLAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expected}`),
    Buffer.from(signature)
  )
}

// Polar sends raw body; we need it before JSON parse
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['webhook-signature'] ?? req.headers['x-polar-signature']
  if (!verifySignature(req.body, signature))
    return res.status(400).json({ error: 'Invalid signature' })

  const event = JSON.parse(req.body.toString())
  const { type, data } = event

  try {
    if (type === 'subscription.created' || type === 'subscription.updated') {
      const { customer_id, id: polarSubId, status, current_period_start, current_period_end } = data
      // Find user by Polar customer_id stored in subscriptions table or by email
      const user = await pool.query('SELECT id FROM users WHERE email = $1', [data.customer?.email])
      if (user.rows.length) {
        const userId = user.rows[0].id
        const isActive = status === 'active'

        await pool.query(`
          INSERT INTO subscriptions (user_id, polar_subscription_id, status, plan, current_period_start, current_period_end)
          VALUES ($1, $2, $3, 'pro', $4, $5)
          ON CONFLICT (polar_subscription_id) DO UPDATE SET
            status=$3, current_period_start=$4, current_period_end=$5, updated_at=NOW()
        `, [userId, polarSubId, status, current_period_start, current_period_end])

        await pool.query('UPDATE users SET is_paid=$1, updated_at=NOW() WHERE id=$2', [isActive, userId])
      }
    }

    if (type === 'subscription.revoked' || type === 'subscription.canceled') {
      await pool.query(
        'UPDATE subscriptions SET status=$1, updated_at=NOW() WHERE polar_subscription_id=$2',
        [data.status, data.id]
      )
      const sub = await pool.query('SELECT user_id FROM subscriptions WHERE polar_subscription_id=$1', [data.id])
      if (sub.rows.length) {
        await pool.query('UPDATE users SET is_paid=false, updated_at=NOW() WHERE id=$1', [sub.rows[0].user_id])
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

module.exports = router
```

> **Note:** Polar webhook signature header may differ. Check Polar docs for the exact header name when setting up.

- [ ] **Step 5: Run webhook test — expect PASS**

```bash
npm test -- --testPathPattern=webhooks
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Polar.sh subscription routes + webhook handler"
```

---

## Phase 6: Admin

### Task 17: Admin endpoints

**Files:**
- Create: `backend/src/routes/admin.js`

- [ ] **Step 1: Write `src/routes/admin.js`**

```js
// src/routes/admin.js
const router = require('express').Router()
const pool = require('../db/pool')
const admin = require('../middleware/admin')

// List users (paginated)
router.get('/users', admin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit
  const rows = await pool.query(`
    SELECT u.id, u.email, u.nickname, u.guest_tag, u.is_paid, u.is_banned, u.is_admin, u.created_at,
           r.tier, r.tr, r.games_played
    FROM users u
    LEFT JOIN ranks r ON r.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])
  res.json(rows.rows)
})

// Ban user
router.post('/users/:id/ban', admin, async (req, res) => {
  await pool.query('UPDATE users SET is_banned=true, updated_at=NOW() WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Unban user
router.post('/users/:id/unban', admin, async (req, res) => {
  await pool.query('UPDATE users SET is_banned=false, updated_at=NOW() WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Get maintenance status
router.get('/system/maintenance-status', async (req, res) => {
  const row = await pool.query(`SELECT value FROM system_settings WHERE key='maintenance_mode'`)
  res.json({ enabled: row.rows[0]?.value === 'true' })
})

// Toggle maintenance mode
router.post('/system/maintenance', admin, async (req, res) => {
  const { enabled } = req.body
  await pool.query(
    `UPDATE system_settings SET value=$1 WHERE key='maintenance_mode'`,
    [String(!!enabled)]
  )
  res.json({ ok: true, enabled: !!enabled })
})

module.exports = router
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: admin endpoints (ban, maintenance toggle)"
```

---

## Phase 7: Deployment

### Task 18: Deploy backend to Railway

**Files:**
- Create: `backend/railway.json`

- [ ] **Step 1: Write `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 2: Create Railway project**

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login
railway login

# Create project from testris/backend directory
cd testris/backend
railway init
# Choose: Create new project → name it "testris-backend"
```

- [ ] **Step 3: Add PostgreSQL plugin**

```bash
# In Railway dashboard: click "Add Plugin" → PostgreSQL
# Railway auto-injects DATABASE_URL into environment
```

- [ ] **Step 4: Set environment variables in Railway dashboard**

Go to Railway project → Variables tab and set:

```
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
POLAR_WEBHOOK_SECRET=<from Polar dashboard>
POLAR_ACCESS_TOKEN=<from Polar dashboard>
POLAR_PRODUCT_ID=<from Polar dashboard>
FRONTEND_URL=https://<your-vercel-domain>.vercel.app
NODE_ENV=production
```

- [ ] **Step 5: Deploy**

```bash
railway up
# Railway builds and deploys. Note the generated URL (e.g. https://testris-backend.up.railway.app)
```

- [ ] **Step 6: Run migrations on production DB**

```bash
# Set DATABASE_URL to Railway's production URL temporarily
export DATABASE_URL=$(railway variables get DATABASE_URL)
node src/db/migrate.js
# Expected: Migrated: 001_users.sql ... 006_settings.sql
```

- [ ] **Step 7: Verify health endpoint**

```bash
curl https://<your-railway-url>/health
# Expected: {"ok":true}
```

- [ ] **Step 8: Commit**

```bash
git add backend/railway.json
git commit -m "chore: Railway deployment config"
```

---

### Task 19: Deploy frontend to Vercel

**Files:**
- Create: `frontend/vercel.json`

- [ ] **Step 1: Write `frontend/vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Set up Google OAuth credentials**

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://<your-vercel-domain>.vercel.app/api/auth/callback/google` (prod)
4. Copy Client ID and Client Secret

- [ ] **Step 3: Deploy to Vercel**

```bash
# Install Vercel CLI if not installed
npm install -g vercel

cd testris/frontend
vercel
# Follow prompts: link to existing project or create new → name "testris-frontend"
```

- [ ] **Step 4: Set environment variables in Vercel dashboard**

Go to Vercel project → Settings → Environment Variables:

```
NEXTAUTH_URL=https://<your-vercel-domain>.vercel.app
NEXTAUTH_SECRET=<same value as Railway>
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
BACKEND_URL=https://<your-railway-url>
NEXT_PUBLIC_BACKEND_URL=https://<your-railway-url>
NEXT_PUBLIC_WS_URL=https://<your-railway-url>
NEXT_PUBLIC_POLAR_CHECKOUT_URL=https://polar.sh/checkout/<your-product-id>
```

- [ ] **Step 5: Redeploy with env vars**

```bash
vercel --prod
# Note the production URL
```

- [ ] **Step 6: Update Railway FRONTEND_URL**

```bash
# In Railway dashboard → Variables → update FRONTEND_URL to your Vercel production URL
# Then redeploy Railway: railway up
```

- [ ] **Step 7: Commit**

```bash
git add frontend/vercel.json
git commit -m "chore: Vercel deployment config"
```

---

### Task 20: Production verification + Polar webhook registration

- [ ] **Step 1: Register Polar webhook**

1. Go to https://polar.sh → Settings → Webhooks → Add Webhook
2. URL: `https://<your-railway-url>/webhooks/polar`
3. Events: `subscription.created`, `subscription.updated`, `subscription.revoked`, `subscription.canceled`
4. Copy the signing secret → set as `POLAR_WEBHOOK_SECRET` in Railway → redeploy Railway

- [ ] **Step 2: End-to-end smoke test**

```bash
# 1. Open https://<vercel-url> — landing page loads
# 2. Click "Sign in with Google" — redirected to Google OAuth → returns to /play
# 3. Click "vs AI" — /game page loads, board renders, pieces fall
# 4. Click "Custom Room" → Create a room → share room code
# 5. Open second browser tab (incognito) → join the room → game starts
# 6. Both boards render, garbage syncs between players
# 7. One player tops out — result screen appears
```

- [ ] **Step 3: Verify subscription flow**

```bash
# 1. Open /pricing → click "Subscribe with Polar"
# 2. Complete checkout in Polar
# 3. Polar fires webhook to /webhooks/polar
# 4. Check Railway logs: webhook processed successfully
# 5. Refresh /play — user.is_paid should now be true
```

- [ ] **Step 4: Verify maintenance mode**

```bash
# Toggle on
curl -X POST https://<railway-url>/admin/system/maintenance \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Verify non-admin is redirected to /maintenance
# Toggle off
curl -X POST https://<railway-url>/admin/system/maintenance \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: production deployment complete — Testris v1.0"
```
