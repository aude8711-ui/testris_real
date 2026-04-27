// ColdClear WASM Web Worker
// Tries to load ColdClear WASM; falls back to a JS heuristic bot.

type PieceChar = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

interface InitMsg  { type: 'init';       piece: PieceChar; next: PieceChar[]; board?: number[][] }
interface AddMsg   { type: 'addPiece';   piece: PieceChar }
interface ReqMsg   { type: 'requestMove' }
interface ResetMsg { type: 'reset';      piece: PieceChar; next: PieceChar[] }
type InMsg = InitMsg | AddMsg | ReqMsg | ResetMsg

const CC_TO_ACTION: Record<string, string> = {
  'Move Left':                'move_left',
  'Move Right':               'move_right',
  'Soft Drop':                'soft_drop',
  'Hard Drop':                'hard_drop',
  'Rotate Clockwise':         'rotate_cw',
  'Rotate Counter-Clockwise': 'rotate_ccw',
  'Rotate 180':               'rotate_180',
  'Hold':                     'hold',
}

// --- Piece mino data (row offset, col offset) — must match engine's PIECES exactly ---
const MINOS: Record<PieceChar, [number, number][][]> = {
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
  G: [[[0,0]]],
}

const COLS = 10
const ROWS = 20

type Board = number[][]  // 0=empty, 1=filled; row 0=bottom

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function fits(board: Board, minos: [number, number][], row: number, col: number): boolean {
  for (const [dr, dc] of minos) {
    const r = row + dr, c = col + dc
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false
    if (board[r][c]) return false
  }
  return true
}

function drop(board: Board, minos: [number, number][], col: number): number {
  let row = ROWS - 1
  while (row >= 0 && fits(board, minos, row, col)) row--
  return row + 1
}

function place(board: Board, minos: [number, number][], row: number, col: number): Board {
  const b = board.map(r => [...r])
  for (const [dr, dc] of minos) {
    const r = row + dr, c = col + dc
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) b[r][c] = 1
  }
  const kept = b.filter(r => !r.every(c => c !== 0))
  while (kept.length < ROWS) kept.push(Array(COLS).fill(0))
  return kept
}

function score(board: Board): number {
  let holes = 0, bumpiness = 0, maxHeight = 0
  const heights: number[] = Array(COLS).fill(0)
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c]) { heights[c] = r + 1; break }
    }
    if (heights[c] > maxHeight) maxHeight = heights[c]
  }
  for (let c = 0; c < COLS; c++) {
    if (c > 0) bumpiness += Math.abs(heights[c] - heights[c - 1])
    for (let r = 0; r < heights[c] - 1; r++) {
      if (!board[r][c]) holes++
    }
  }
  return -0.51 * maxHeight - 0.36 * holes - 0.18 * bumpiness
}

function bestMove(board: Board, type: PieceChar): { col: number; rot: number } {
  const rotations = MINOS[type]?.length ?? 1
  let best = -Infinity, bestCol = 0, bestRot = 0
  for (let rot = 0; rot < rotations; rot++) {
    const minos = MINOS[type]?.[rot] ?? []
    for (let col = -2; col < COLS + 2; col++) {
      const row = drop(board, minos, col)
      if (!fits(board, minos, row, col)) continue
      const b2 = place(board, minos, row, col)
      const s = score(b2)
      if (s > best) { best = s; bestCol = col; bestRot = rot }
    }
  }
  return { col: bestCol, rot: bestRot }
}

function movesToPlace(currentRot: number, targetRot: number, currentCol: number, targetCol: number): string[] {
  const actions: string[] = []
  let rot = currentRot
  const rotDiff = ((targetRot - rot) % 4 + 4) % 4
  if (rotDiff === 1) actions.push('rotate_cw')
  else if (rotDiff === 2) actions.push('rotate_180')
  else if (rotDiff === 3) actions.push('rotate_ccw')
  rot = targetRot

  const dc = targetCol - currentCol
  for (let i = 0; i < Math.abs(dc); i++) {
    actions.push(dc > 0 ? 'move_right' : 'move_left')
  }
  actions.push('hard_drop')
  return actions
}

// --- State ---
let jsBoard: Board = emptyBoard()
let currentPiece: PieceChar = 'I'
let pendingActions: string[] = []

// WASM bot (optional)
let wasmBot: any = null

async function tryLoadWasm(piece: PieceChar, next: PieceChar[]) {
  try {
    // @ts-ignore
    const mod = await import(/* webpackIgnore: true */ '/wasm/cold-clear.js')
    await mod.default()
    wasmBot = mod.BotHandle.create({}, piece, next)
    self.postMessage({ type: 'ready' })
  } catch {
    // WASM not available — use JS bot
    wasmBot = null
    self.postMessage({ type: 'ready' })
  }
}

self.addEventListener('message', async (e: MessageEvent<InMsg>) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      jsBoard = msg.board
        ? msg.board.map(row => row.map(c => (c ? 1 : 0)))
        : emptyBoard()
      currentPiece = msg.piece
      pendingActions = []
      await tryLoadWasm(msg.piece, msg.next)
      break

    case 'addPiece':
      currentPiece = msg.piece
      wasmBot?.addNextPiece(msg.piece)
      break

    case 'requestMove': {
      if (wasmBot) {
        const result = wasmBot.nextMove({})
        if (result) {
          const actions = (result.inputs as string[]).map(i => CC_TO_ACTION[i] ?? i)
          self.postMessage({ type: 'move', actions, hold: result.hold })
          break
        }
      }
      // JS fallback bot
      const { col, rot } = bestMove(jsBoard, currentPiece)
      const actions = movesToPlace(0, rot, 3, col)
      // update internal board
      const minos = MINOS[currentPiece]?.[rot] ?? []
      const row = drop(jsBoard, minos, col)
      if (fits(jsBoard, minos, row, col)) {
        jsBoard = place(jsBoard, minos, row, col)
      }
      self.postMessage({ type: 'move', actions, hold: false })
      break
    }

    case 'reset':
      jsBoard = emptyBoard()
      currentPiece = msg.piece
      pendingActions = []
      wasmBot = null
      await tryLoadWasm(msg.piece, msg.next)
      break
  }
})
