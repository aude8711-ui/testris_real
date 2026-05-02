# Testris — 진행 상황 (2026-04-30)

## 프로젝트 개요

TETR.IO에서 영감받은 브라우저 기반 1v1 PvP 테트리스 SaaS.

- vs-AI 모드(El-Tetris 봇) **완전 구현 + 배포 완료**
- PvP 룸, 랭크 시스템, Polar 결제 **코드 구현 완료 · 결제 연동만 미완**

---

## 기술 스택

| 레이어 | 선택 | 배포 |
|--------|------|------|
| Frontend | Next.js (App Router) + Zustand + NextAuth HS256 | Vercel |
| Backend  | Node.js 20 + Express 5 + Socket.io 4 + PostgreSQL 16 | Railway |
| 결제 | Polar.sh ($9.99/mo) | 코드 완성 · 환경변수 미설정 |
| AI 봇 | El-Tetris (Dellacherie 6가중치) — ColdClear WASM 업그레이드 경로 있음 | — |

---

## 배포 URL (현재 라이브)

- **프론트엔드:** `https://frontend-rho-rust-62.vercel.app/game`
- **백엔드:** `https://testris-backend-production.up.railway.app`
- **헬스체크:** `https://testris-backend-production.up.railway.app/health` → `{"ok":true}`

---

## 레포지토리 구조

```
testris/                          ← 이 디렉토리 기준
├── PROGRESS.md                   ← 이 파일
├── README.md
├── docs/
│   └── superpowers/plans/
│       └── 2026-04-25-testris-implementation.md   ← 전체 구현 계획
├── backend/
│   ├── src/
│   │   ├── server.js             ← Express + Socket.io 진입점
│   │   ├── config.js             ← env 로더
│   │   ├── db/
│   │   │   ├── pool.js           ← pg Pool
│   │   │   └── migrate.js        ← SQL 마이그레이션 러너
│   │   ├── migrations/           ← 001~006 SQL 파일 (별도 디렉토리 확인 필요)
│   │   ├── middleware/
│   │   │   ├── auth.js           ← JWT(NEXTAUTH_SECRET) 검증
│   │   │   └── admin.js          ← is_admin 체크
│   │   ├── routes/
│   │   │   ├── auth.js           ← POST /auth/sync (구글 OAuth 사용자 등록)
│   │   │   ├── users.js          ← GET /users/:id, PATCH /users/me (닉네임)
│   │   │   ├── rooms.js          ← CRUD 룸
│   │   │   ├── subscriptions.js  ← GET /subscriptions/me
│   │   │   ├── webhooks.js       ← POST /webhooks/polar (HMAC 검증 + DB 업데이트)
│   │   │   └── admin.js          ← GET /admin/users, PATCH ban/unban/maintenance
│   │   └── socket/
│   │       ├── index.js          ← Socket.io 초기화
│   │       ├── matchmaking.js    ← 매치메이킹 큐
│   │       ├── game.js           ← 게임 이벤트 (board_update, garbage, topOut)
│   │       └── room.js           ← 룸 참가/나가기/채팅
│   └── tests/
│       ├── auth.test.js          ← POST /auth/sync 검증 테스트
│       ├── rank.test.js          ← TR 점수 계산
│       ├── rooms.test.js         ← 룸 CRUD
│       └── webhooks.test.js      ← Polar 웹훅 시그니처 검증
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx           ← 랜딩 (로그인 링크)
        │   ├── login/page.tsx     ← Google OAuth 로그인
        │   ├── play/page.tsx      ← 모드 선택 (vs AI / Ranked / Custom Room)
        │   ├── game/page.tsx      ← ★ vs-AI 게임 (완전 구현)
        │   ├── room/page.tsx      ← 룸 목록 + 생성
        │   ├── room/[id]/page.tsx ← 개별 룸 (Socket.io PvP)
        │   ├── profile/[id]/page.tsx
        │   ├── settings/page.tsx  ← 키 바인딩 설정
        │   ├── pricing/page.tsx   ← Polar 구독 ($9.99)
        │   └── admin/page.tsx     ← 관리자 패널
        ├── components/game/
        │   ├── GameBoard.tsx      ← 10×20 보드 렌더
        │   ├── BotPanel.tsx       ← 봇 보드 + 봇 루프
        │   ├── NextQueue.tsx      ← 다음 피스 큐
        │   ├── HoldPiece.tsx      ← 홀드 피스
        │   └── AttackMeter.tsx    ← 가비지 인디케이터
        ├── lib/
        │   ├── tetris/
        │   │   ├── engine.ts      ← 게임 엔진 (SRS, lock delay, 7-bag)
        │   │   ├── pieces.ts      ← 테트로미노 정의
        │   │   ├── rotation.ts    ← SRS 킥 테이블
        │   │   ├── attack.ts      ← 가비지 계산 (B2B, combo)
        │   │   ├── actions.ts     ← 액션 디스패처
        │   │   ├── keybindings.ts ← 키 → 액션 매핑
        │   │   ├── handling.ts    ← DAS/ARR 설정
        │   │   └── randomizer.ts  ← 7-bag 랜덤화
        │   ├── workers/
        │   │   ├── coldclear.worker.ts  ← ★ El-Tetris AI + ColdClear WASM 래퍼
        │   │   └── useBot.ts            ← Worker 훅
        │   ├── api.ts             ← REST API 클라이언트
        │   ├── socket.ts          ← Socket.io 클라이언트
        │   └── store.ts           ← Zustand 전역 상태
        └── auth.ts                ← NextAuth 설정
```

---

## 완료된 작업

### Phase 1 — 백엔드 기반 ✅
- Express + Socket.io 서버 (`/health` 엔드포인트 포함)
- PostgreSQL 마이그레이션 6개: users, subscriptions, ranks, game_records, rooms, user_settings
- JWT 미들웨어 (`NEXTAUTH_SECRET` 공유 시크릿)
- Admin 미들웨어

### Phase 2 — API 라우트 ✅
- `POST /auth/sync` — 구글 로그인 시 사용자 upsert
- `GET/PATCH /users/me` — 닉네임, `GET /users/:id` — 프로필
- `GET/POST /rooms`, `GET/POST /rooms/:code` — 룸 CRUD + 비밀번호
- `GET /subscriptions/me`
- `POST /webhooks/polar` — HMAC 검증, subscription.created/updated/revoked/canceled 처리 → `users.is_paid` 자동 토글
- Admin: 유저 목록, ban/unban, maintenance 모드

### Phase 3 — Socket.io ✅
- 매치메이킹 큐 (랭크/일반)
- 룸 참가/나가기/채팅
- 게임 이벤트 릴레이 (board_update, garbage, topOut, result)
- 랭크 TR 계산 (게임 종료 시 DB 업데이트)

### Phase 4 — 게임 엔진 ✅
- `engine.ts`: SRS 회전, lock delay, 7-bag, topOut 감지, 가비지 수신
- `attack.ts`: B2B, 콤보, T-spin 가비지 계산
- 테스트: `__tests__/` 내 engine, rotation, attack, randomizer, keybindings

### Phase 5 — vs-AI 모드 ✅ (핵심 완성)
- `game/page.tsx`: 봇 1~3개 선택, 60fps RAF 루프, DAS/ARR, ESC 일시정지
- `coldclear.worker.ts`: El-Tetris (Dellacherie 6가중치) 폴백 AI
  - Board sync: 매 수마다 실제 엔진 보드로 jsBoard 덮어씀 (발산 방지)
  - Center-bias: `3.5/unit` (El-Tetris 벽 이점 ~6.4점 극복)
  - `BOT_THINK_MS = 100ms`
  - ColdClear WASM: `/public/wasm/cold-clear.js` 존재 시 자동 우선 사용 (현재 파일 없음 → El-Tetris 폴백)
- `BotPanel.tsx`: 봇 보드 렌더 + 봇 루프 (가비지 송수신)
- 키: ← → 이동, ↑ 회전CW, Z/Ctrl 반시계, A 180도, Space 하드드롭, C 홀드, ESC 일시정지

### Phase 6 — 프론트엔드 UI ✅
- 로그인(Google OAuth), 모드 선택, 룸 목록/생성, 룸 게임, 프로필, 설정, Pricing 페이지
- Vercel 배포 완료
- 로그아웃 기능
- 뒤로가기 버튼 (Profile, Settings, vs AI 방)
- Settings 페이지 재구성 (Controls + Handling 통합)

---

## 현재 진행 중

- 피스 스폰 방향 수정 (J, L, T, S, Z + CW/CCW 버그)

---

## 현재 미완 (남은 작업)

### 🔴 필수: Polar 결제 연동 (3단계)

아직 결제 버튼이 `#` 링크임. 다음 3단계로 완성:

**Step 1 — Polar 대시보드에서 체크아웃 URL 발급**
1. [polar.sh](https://polar.sh) 로그인
2. 대시보드 → Products → $9.99/mo 상품 생성 (없으면)
3. 해당 상품의 **Checkout URL** 복사

**Step 2 — Vercel 환경변수 설정**
```
NEXT_PUBLIC_POLAR_CHECKOUT_URL=<복사한 체크아웃 URL>
```
- Vercel 대시보드 → 프로젝트 Settings → Environment Variables

**Step 3 — Polar 웹훅 등록**
- Polar 대시보드 → Developers → Webhooks → 새 웹훅
- URL: `https://testris-backend-production.up.railway.app/webhooks/polar`
- Events: `subscription.created`, `subscription.updated`, `subscription.revoked`, `subscription.canceled`
- 시크릿 생성 → Railway 환경변수 `POLAR_WEBHOOK_SECRET` 에 설정

**Step 4 — 재배포**
```bash
cd testris/frontend
vercel --prod
```

---

### 🟡 선택: ColdClear WASM 업그레이드 (봇 강화)

현재 El-Tetris 봇으로도 충분히 작동하지만, 더 강한 봇 원하면:
1. [ColdClear WASM 빌드](https://github.com/MinusKelvin/cold-clear) 또는 미리 빌드된 파일 취득
2. `testris/frontend/public/wasm/cold-clear.js` 와 `cold-clear_bg.wasm` 배치
3. 자동으로 우선 사용됨 (worker 코드 변경 불필요)

---

### 🟡 선택: T-spin 구현

현재 El-Tetris는 `hard_drop`만 사용. T-spin은 구조상 추가 복잡:
- `engine.ts`에 T-spin 판정 로직 추가 필요
- `attack.ts`는 이미 T-spin 가비지 계산 지원 (`lastLock.tspin` 필드 기반)
- 봇 워커는 hard_drop 위주라 T-spin 플레이 안 함 (ColdClear WASM은 지원)

---

## 알려진 이슈

| 이슈 | 원인 | 해결책 |
|------|------|--------|
| 결제 버튼 `#` 링크 | `NEXT_PUBLIC_POLAR_CHECKOUT_URL` 미설정 | 위 Polar 연동 단계 |
| ColdClear WASM 없음 | WASM 파일 미배치 | `/public/wasm/`에 파일 추가 |
| 봇이 T-spin 안 함 | El-Tetris = hard_drop only | ColdClear WASM 사용 시 해결 |
| 게임오버 판정 버그 | 천장 닿으면 즉시 사망 (Block Out 방식) | Lock Out 방식으로 수정 필요 |

---

## 환경변수 체크리스트

### Backend (Railway)
```
DATABASE_URL=postgresql://...            ✅ 설정됨 (Railway가 자동 제공)
NEXTAUTH_SECRET=...                      ✅ 설정됨
PORT=...                                 ✅ 설정됨
FRONTEND_URL=https://frontend-rho-rust-62.vercel.app
POLAR_WEBHOOK_SECRET=...                 ❌ 미설정 (Polar 연동 시 필요)
POLAR_ACCESS_TOKEN=...                   ❌ 미설정 (선택)
POLAR_PRODUCT_ID=...                     ❌ 미설정 (선택)
```

### Frontend (Vercel)
```
NEXTAUTH_URL=https://frontend-rho-rust-62.vercel.app
NEXTAUTH_SECRET=...                      ✅ 설정됨
NEXT_PUBLIC_BACKEND_URL=https://testris-backend-production.up.railway.app
GOOGLE_CLIENT_ID=...                     ✅ 설정됨
GOOGLE_CLIENT_SECRET=...                 ✅ 설정됨
NEXT_PUBLIC_POLAR_CHECKOUT_URL=...       ❌ 미설정 ← 이것만 추가하면 결제 완성
```

---

## 다음 세션 시작 방법

```bash
# 현재 상태 확인
cd testris
git log --oneline -5

# 로컬 백엔드 실행 (PostgreSQL 필요)
cd backend
cp .env.example .env   # DB 등 설정 후
npm start

# 로컬 프론트엔드 실행
cd frontend
npm run dev            # localhost:3000
```

**가장 빠른 완성 경로:**  
1. Polar에서 체크아웃 URL 발급 (5분)  
2. Vercel에 `NEXT_PUBLIC_POLAR_CHECKOUT_URL` 추가 (2분)  
3. Polar 웹훅 등록 + Railway에 `POLAR_WEBHOOK_SECRET` 설정 (5분)  
4. `vercel --prod` 재배포 (2분)  
→ **총 약 15분으로 완전한 SaaS 완성**
