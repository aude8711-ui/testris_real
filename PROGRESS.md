# Testris — 진행 상황 (2026-06-08)

## 프로젝트 개요

TETR.IO에서 영감받은 브라우저 기반 1v1 PvP 테트리스 SaaS.

- vs-AI 모드(El-Tetris 봇) **완전 구현 + 배포 완료**
- PvP 룸, 랭크 시스템, Polar 결제 **코드 구현 완료 · 결제 연동만 미완**

---

## 기술 스택

| 레이어 | 선택 | 배포 |
|--------|------|------|
| Frontend | Next.js (App Router) + Zustand + NextAuth HS256 | Vercel |
| Backend  | Node.js 20 + Express 5 + Socket.io 4 + PostgreSQL 16 | Render.com |
| 결제 | Polar.sh ($9.99/mo) | 코드 완성 · 환경변수 미설정 |
| AI 봇 | El-Tetris (Dellacherie 6가중치) — ColdClear WASM 업그레이드 경로 있음 | — |

---

## 저장소

- **GitHub:** https://github.com/aude8711-ui/testris_real (main 브랜치 = 구 계정 feat/build)

## 배포 URL

- **프론트엔드:** `https://frontend-rho-rust-62.vercel.app/game` ← 구 계정, 신규 Vercel 프로젝트 생성 후 교체 필요
- **백엔드 (Render):** `https://testris-backend.onrender.com` ← 구 계정, 신규 Railway 프로젝트 생성 후 교체 필요
- **헬스체크:** `https://<railway-backend-url>/health` → `{"ok":true}`

> **인프라 변경 (2026-06-08):** Railway 무료 체험 만료로 백엔드 오프라인. `render.yaml` Blueprint로 Render.com 무료 티어로 이전 중.
> **계정 마이그레이션 (2026-06-17):** 구 GitHub 계정(`sinuig271-cmyk`)·Vercel·Railway 체험 종료로 새 계정(`aude8711-ui`)으로 이전. 저장소는 `testris_real`로 새로 생성, `feat/build` → `main`으로 push 완료. Vercel/Railway 프로젝트는 신규 계정에서 재생성 필요 (이 저장소 연결, root dir: frontend/backend). 기존에 커밋된 `NEXTAUTH_SECRET`/`POLAR_WEBHOOK_SECRET` 값은 노출된 것으로 간주하고 신규 환경에서는 새로 생성할 것.

---

## 레포지토리 구조

```
testris/                          ← 이 디렉토리 기준
├── PROGRESS.md                   ← 이 파일
├── render.yaml                   ← Render Blueprint (backend + PostgreSQL)
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
- `engine.ts`: SRS 회전, lock delay, 7-bag, 가비지 수신
- `engine.ts`: **Lock Out 게임오버** (피스가 버퍼 구역에 완전히 잠길 때만 사망 — BOARD_ROWS=24, VISIBLE_ROWS=20, SPAWN_ROW=20으로 버퍼 구역 도입)
- `engine.ts`: **T-spin 감지** (3-코너 룰 full/mini + non-T immobile all-spin)
- `attack.ts`: B2B, 콤보, T-spin 가비지 계산
- 테스트: `__tests__/` 내 engine, rotation, attack, randomizer, keybindings

### Phase 5 — vs-AI 모드 ✅ (핵심 완성)
- `game/page.tsx`: 봇 1~3개 선택, 60fps RAF 루프, DAS/ARR, ESC 일시정지
- `coldclear.worker.ts`: El-Tetris **2-piece lookahead** AI ✅ (2026-06-01 업그레이드)
  - Board sync: 매 수마다 실제 엔진 보드로 jsBoard 덮어씀 (발산 방지)
  - Center-bias: `3.5/unit` (El-Tetris 벽 이점 ~6.4점 극복)
  - `BOT_THINK_MS = 100ms` (2-ply 탐색: ~2300 evaluation, 100ms 내 충분)
  - **2-piece lookahead**: `bestMove2()` — `eval(board_after_p1) + max(eval(board_after_p2))`
  - ColdClear WASM: `/public/wasm/cold-clear.js` 존재 시 자동 우선 사용 (현재 파일 없음 → lookahead 폴백)
- `BotPanel.tsx`: 봇 보드 렌더 + 봇 루프 (가비지 송수신)
- 키: ← → 이동, ↑ 회전CW, Z/Ctrl 반시계, A 180도, Space 하드드롭, C 홀드, ESC 일시정지

### Phase 5.5 — 입력 시스템 개선 ✅
- DAS/ARR/SDF 핸들링 구현
- SRS 킥 테이블 수정 (180° 킥 포함)
- 피스 스폰 방향 수정 (J, L, T, S, Z CW/CCW 버그 수정)
- 피스 색상 수정 ✅ (S=초록, Z=빨강, J=파랑, L=주황 — Tetris Guideline 기준 완료)
- 회전 키바인딩 기본값 확정: ArrowUp=CW, Control=CCW, A=180°, C=홀드
  (`keybindings.ts` + `game/page.tsx` Control fallback 동시 수정)

### Phase 6 — 프론트엔드 UI ✅
- 로그인(Google OAuth), 모드 선택, 룸 목록/생성, 룸 게임, 프로필, 설정, Pricing 페이지
- Vercel 배포 완료
- 로그아웃 기능
- 뒤로가기 버튼 (Profile, Settings, vs AI 방)
- Settings 페이지 재구성 (Controls + Handling 통합)

### Phase 7 — 인프라 (Railway → Render) 🔄
- `render.yaml` Blueprint: Web Service (`testris-backend`) + PostgreSQL (`testris-db`)
- `backend/railway.json` 제거
- `pool.js`: Railway 내부 호스트 체크 → 로컬 DB 제외 시 SSL 활성화 (Render 호환)
- `package.json`: `prestart`로 배포 시 마이그레이션 자동 실행, `engines.node >= 20`

---

## 코드 검증 결과 (2026-06-01)

`feat/build` 브랜치 실제 코드 기준으로 4가지 항목 검증 완료.

| 항목 | 파일 | 결과 | 비고 |
|------|------|------|------|
| 피스 스폰 방향 (J/L/T/S/Z) | `pieces.ts` rotation state 0 | ✅ 정상 | Y-up 좌표계 기준 Tetris Guideline 일치 |
| 키 바인딩 기본값 | `keybindings.ts` L10-11 | ✅ 정상 | `rotate_cw='ArrowUp'`, `rotate_ccw='Control'` |
| Lock Out 게임오버 | `engine.ts` L162-176 | ✅ 정상 | `anyInBoard` 체크, 버퍼 구역만 잠기면 `topOut=true` |
| T-spin 감지 + 공격 계산 | `engine.ts` L252-279, `attack.ts` L13-14 | ✅ 정상 | `detectSpin()` 3코너룰 + immobile, `LockResult.tSpin` → `BASE_ATTACK` 조회 |
| 피스 색상 (S/Z, J/L) | `pieces.ts` L56-59 | ✅ 수정완료 | S=초록, Z=빨강, J=파랑, L=주황으로 Guideline 맞춤 |

---

## 현재 진행 중

### 백엔드 Render.com 마이그레이션 🔄
- `render.yaml` Blueprint 생성 완료 (Web Service + PostgreSQL)
- `backend/railway.json` 제거, `pool.js` SSL 로직 Render 호환으로 수정
- `npm start` 시 `prestart`로 DB 마이그레이션 자동 실행
- Render 대시보드 배포 + Vercel `NEXT_PUBLIC_BACKEND_URL` 업데이트 대기 중

### PvP 멀티플레이어
- 코드는 구현됨 (Socket.io 룸/매치메이킹) — **현재 스코프에서 스킵**

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
- URL: `https://<render-backend-url>/webhooks/polar`
- Events: `subscription.created`, `subscription.updated`, `subscription.revoked`, `subscription.canceled`
- 시크릿 생성 → Render 환경변수 `POLAR_WEBHOOK_SECRET` 에 설정

**Step 4 — 재배포**
```bash
cd testris/frontend
vercel --prod
```

---

### 🟡 선택: ColdClear WASM 업그레이드 (봇 최강화)

현재 El-Tetris **2-piece lookahead**로 업그레이드 완료 (2026-06-01).  
더 강한 ColdClear WASM을 원하면 아래 수동 빌드 가이드 참조.

- `coldclear.worker.ts`: `bestScore()` + `bestMove2()` 추가
- `useBot.ts`: `requestMove(board, next)` 시그니처 확장
- `BotPanel.tsx`: `requestMove` 호출 시 `eng.state.next` 전달
- **중요**: ColdClear WASM 파일이 존재하면 여전히 자동 우선 사용됨

#### ColdClear WASM 수동 빌드 가이드

ColdClear는 prebuilt WASM을 배포하지 않음 (2024년 1월 아카이브). 직접 빌드 필요.

**Step 1 — Rust + wasm-pack 설치**
```bash
# Rust 설치 (이미 있으면 skip)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# wasm-pack 설치
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**Step 2 — ColdClear 소스 클론 및 브라우저 빌드**
```bash
git clone https://github.com/MinusKelvin/cold-clear
cd cold-clear

# browser 타깃으로 wasm-pack 빌드 (js 바인딩 포함)
wasm-pack build --target web --out-dir pkg -- --features wasm
```

**Step 3 — 빌드 결과물 배치**
```bash
# 빌드 결과: cold-clear/pkg/ 디렉터리
cp cold-clear/pkg/cold_clear.js   testris/frontend/public/wasm/cold-clear.js
cp cold-clear/pkg/cold_clear_bg.wasm testris/frontend/public/wasm/cold-clear_bg.wasm
```

**Step 4 — API 호환성 확인**  
worker가 기대하는 인터페이스:
```typescript
mod.BotHandle.create({}, piece, next)  // 생성
wasmBot.addNextPiece(piece)             // 다음 피스 추가
wasmBot.nextMove({})                    // → { inputs: string[], hold: bool }
```
빌드된 `cold-clear.js`가 이 API를 export하는지 확인. 이름이 다르면 worker의 `tryLoadWasm()` 수정 필요.

**Step 5 — 배포**
```bash
cd testris/frontend && vercel --prod
```

---

### 🟡 선택: T-spin ~~구현~~ ✅ 완료

~~`engine.ts`에 T-spin 판정 로직 추가 필요~~  
`detectSpin()` 구현 완료. 봇은 여전히 hard_drop 위주라 T-spin 플레이 안 함 (ColdClear WASM은 지원).

---

## 알려진 이슈

| 이슈 | 원인 | 해결책 |
|------|------|--------|
| 결제 버튼 `#` 링크 | `NEXT_PUBLIC_POLAR_CHECKOUT_URL` 미설정 | 위 Polar 연동 단계 |
| ColdClear WASM 없음 | WASM 파일 미배치 | `/public/wasm/`에 파일 추가 |
| 봇이 T-spin 안 함 | El-Tetris = hard_drop only | ColdClear WASM 사용 시 해결 |
| ~~게임오버 판정 버그~~ | ~~Block Out 방식~~ | ✅ Lock Out 방식으로 수정 완료 |
| ~~피스 색상 S/Z·J/L 쌍 교체~~ | ~~`pieces.ts` 색상값 실수~~ | ✅ 수정 완료 |

---

## 환경변수 체크리스트

### Backend (Render.com)
```
DATABASE_URL=postgresql://...            ← Render PostgreSQL이 Blueprint로 자동 연결
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://frontend-rho-rust-62.vercel.app
NEXTAUTH_SECRET=7uXnRXHM8eByugIC4e0zFvwxfnY9MNntfP57bWwYWzQ=
POLAR_WEBHOOK_SECRET=polar_whs_BJon4DAvuvCSaKBE6il8KB71T3gp82aycNr4Y2jSWsb
POLAR_ACCESS_TOKEN=...                   ❌ 미설정 (선택)
POLAR_PRODUCT_ID=...                     ❌ 미설정 (선택)
```

### Frontend (Vercel)
```
NEXTAUTH_URL=https://frontend-rho-rust-62.vercel.app
NEXTAUTH_SECRET=...                      ✅ 설정됨
NEXT_PUBLIC_BACKEND_URL=https://<render-backend-url>   ← Render 배포 후 업데이트 필요
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
1. Render 백엔드 배포 + Vercel `NEXT_PUBLIC_BACKEND_URL` 업데이트 (10분)  
2. Polar에서 체크아웃 URL 발급 (5분)  
3. Vercel에 `NEXT_PUBLIC_POLAR_CHECKOUT_URL` 추가 (2분)  
4. Polar 웹훅 등록 + Render에 `POLAR_WEBHOOK_SECRET` 설정 (5분)  
5. `vercel --prod` 재배포 (2분)  
→ **총 약 25분으로 완전한 SaaS 완성**
