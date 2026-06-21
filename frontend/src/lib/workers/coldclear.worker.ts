// ColdClear WASM Web Worker
// Tries to load ColdClear WASM; falls back to El-Tetris (Dellacherie) bot.

import { PIECES, PieceType } from '../tetris/pieces'
import { getKicks } from '../tetris/rotation'

interface InitMsg  { type: 'init';       piece: PieceType; next: PieceType[]; board?: number[][] }
interface AddMsg   { type: 'addPiece';   piece: PieceType }
interface ReqMsg   { type: 'requestMove'; board?: number[][]; next?: PieceType[] }
interface ResetMsg { type: 'reset';      piece: PieceType; next: PieceType[] }
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

const COLS = 10
const ROWS = 20

type Board = number[][]  // row 0 = bottom, row 19 = top

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function fits(board: Board, minos: number[][], row: number, col: number): boolean {
  for (const [dr, dc] of minos) {
    const r = row + dr, c = col + dc
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false
    if (board[r][c]) return false
  }
  return true
}

function drop(board: Board, minos: number[][], col: number): number {
  const drs = minos.map(([dr]) => dr)
  const maxDr = Math.max(...drs)
  const minDr = Math.min(...drs)
  let row = ROWS - 1 - maxDr  // highest reference row where top mino is still in bounds
  while (row >= -minDr && fits(board, minos, row, col)) row--
  return row + 1
}

interface PlaceResult {
  board: Board
  linesCleared: number
  erasedCells: number  // minos of placed piece that were in cleared rows
  landingRow: number   // highest row index among placed minos (before clearing)
}

function place(board: Board, minos: number[][], row: number, col: number): PlaceResult {
  const b = board.map(r => [...r])
  let landingRow = 0

  for (const [dr, dc] of minos) {
    const r = row + dr, c = col + dc
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      b[r][c] = 1
      if (r > landingRow) landingRow = r
    }
  }

  const fullRows = new Set<number>()
  for (let r = 0; r < ROWS; r++) {
    if (b[r].every(c => c !== 0)) fullRows.add(r)
  }

  let erasedCells = 0
  for (const [dr] of minos) {
    if (fullRows.has(row + dr)) erasedCells++
  }

  const kept = b.filter((_, r) => !fullRows.has(r))
  while (kept.length < ROWS) kept.push(Array(COLS).fill(0))

  return { board: kept, linesCleared: fullRows.size, erasedCells, landingRow }
}

// El-Tetris evaluation — Dellacherie weights
// See: Thiery & Scherrer, "Improvements on Learning Tetris with Cross Entropy" (2009)
function elTetris(board: Board, landingRow: number, linesCleared: number, erasedCells: number): number {
  const landingHeight = landingRow + 1           // 1-based height from floor
  const erodedPieces  = linesCleared * erasedCells

  // Row transitions: horizontal filled↔empty changes (walls count as filled)
  let rowTrans = 0
  for (let r = 0; r < ROWS; r++) {
    let prev = 1
    for (let c = 0; c < COLS; c++) {
      const cur = board[r][c] ? 1 : 0
      if (cur !== prev) rowTrans++
      prev = cur
    }
    if (prev === 0) rowTrans++  // right wall
  }

  // Column transitions: vertical filled↔empty changes (floor counts as filled)
  let colTrans = 0
  for (let c = 0; c < COLS; c++) {
    let prev = 1  // floor
    for (let r = 0; r < ROWS; r++) {
      const cur = board[r][c] ? 1 : 0
      if (cur !== prev) colTrans++
      prev = cur
    }
  }

  // Buried holes: empty cells with ≥1 filled cell above
  let holes = 0
  for (let c = 0; c < COLS; c++) {
    let hasFilledAbove = false
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c]) {
        hasFilledAbove = true
      } else if (hasFilledAbove) {
        holes++
      }
    }
  }

  // Well sums: consecutive empty cells flanked by filled/wall on both sides
  // Cumulative depth penalizes deeper wells more (1+2+3+... per well)
  let wells = 0
  for (let c = 0; c < COLS; c++) {
    let depth = 0
    for (let r = ROWS - 1; r >= 0; r--) {
      const leftFilled  = c === 0       || board[r][c - 1] !== 0
      const rightFilled = c === COLS - 1 || board[r][c + 1] !== 0
      if (!board[r][c] && leftFilled && rightFilled) {
        wells += ++depth
      } else {
        depth = 0
      }
    }
  }

  return (
    -4.500158825082766  * landingHeight +
     3.4181268101392694 * erodedPieces  +
    -3.2178882868487753 * rowTrans      +
    -9.348695305445199  * colTrans      +
    -7.899265427351652  * holes         +
    -3.3855972247263626 * wells
  )
}

function bestMove(board: Board, type: PieceType): { col: number; rot: number } {
  const rotations = PIECES[type]?.length ?? 1
  let best = -Infinity, bestCol = 0, bestRot = 0
  for (let rot = 0; rot < rotations; rot++) {
    const minos = PIECES[type]?.[rot] ?? []
    const dcVals = minos.map(([, dc]) => dc)
    const pieceCenter = (Math.min(...dcVals) + Math.max(...dcVals)) / 2
    for (let col = -2; col < COLS + 2; col++) {
      const row = drop(board, minos, col)
      if (!fits(board, minos, row, col)) continue
      const r = place(board, minos, row, col)
      // center-bias: penalizes wall placements; 3.5 overcomes El-Tetris row-transition wall advantage (~6.4)
      const centerBias = -3.5 * Math.abs(col + pieceCenter - (COLS - 1) / 2) / (COLS / 2)
      const s = elTetris(r.board, r.landingRow, r.linesCleared, r.erasedCells) + centerBias
      if (s > best) { best = s; bestCol = col; bestRot = rot }
    }
  }
  return { col: bestCol, rot: bestRot }
}

// Returns the best El-Tetris score achievable for `type` on `board` (any placement).
function bestScore(board: Board, type: PieceType): number {
  const rotations = PIECES[type]?.length ?? 1
  let best = -Infinity
  for (let rot = 0; rot < rotations; rot++) {
    const minos = PIECES[type]?.[rot] ?? []
    const dcVals = minos.map(([, dc]) => dc)
    const pieceCenter = (Math.min(...dcVals) + Math.max(...dcVals)) / 2
    for (let col = -2; col < COLS + 2; col++) {
      const row = drop(board, minos, col)
      if (!fits(board, minos, row, col)) continue
      const r = place(board, minos, row, col)
      const centerBias = -3.5 * Math.abs(col + pieceCenter - (COLS - 1) / 2) / (COLS / 2)
      const s = elTetris(r.board, r.landingRow, r.linesCleared, r.erasedCells) + centerBias
      if (s > best) best = s
    }
  }
  return best === -Infinity ? 0 : best
}

// 2-piece lookahead: picks the placement of `type` that maximises
// eval(board_after_type) + best_eval(board_after_nextType).
function bestMove2(board: Board, type: PieceType, nextType: PieceType): { col: number; rot: number } {
  const rotations = PIECES[type]?.length ?? 1
  let best = -Infinity, bestCol = 0, bestRot = 0
  for (let rot = 0; rot < rotations; rot++) {
    const minos = PIECES[type]?.[rot] ?? []
    const dcVals = minos.map(([, dc]) => dc)
    const pieceCenter = (Math.min(...dcVals) + Math.max(...dcVals)) / 2
    for (let col = -2; col < COLS + 2; col++) {
      const row = drop(board, minos, col)
      if (!fits(board, minos, row, col)) continue
      const r = place(board, minos, row, col)
      const centerBias = -3.5 * Math.abs(col + pieceCenter - (COLS - 1) / 2) / (COLS / 2)
      const s = elTetris(r.board, r.landingRow, r.linesCleared, r.erasedCells) + centerBias
              + bestScore(r.board, nextType)
      if (s > best) { best = s; bestCol = col; bestRot = rot }
    }
  }
  return { col: bestCol, rot: bestRot }
}

// engine.ts spawnPiece(): { rotation: 0, row: SPAWN_ROW, col: SPAWN_COL }
const SPAWN_ROW = 20
const SPAWN_COL = 3

// Column bounds only — the spawn row sits in the buffer zone above the
// tracked board, so the only way a kick can fail there is running off
// the left/right edge (mirrors rotation.ts's fitsOnBoard, minus the
// out-of-tracked-board row case which can't collide with anything).
function fitsAtSpawn(board: Board, minos: number[][], row: number, col: number): boolean {
  for (const [dr, dc] of minos) {
    const r = row + dr, c = col + dc
    if (c < 0 || c >= COLS) return false
    if (r >= 0 && r < ROWS && board[r][c]) return false
  }
  return true
}

// Predicts the column the real engine's tryRotate (rotation.ts) lands on when
// rotating straight from spawn (rotation 0, col SPAWN_COL) to targetRot, by
// walking the same kick table it uses. Keeps this in lockstep with the real
// engine — no more hardcoded per-piece offsets to drift out of sync.
function spawnColAfterRotation(board: Board, type: PieceType, targetRot: number): number {
  if (targetRot === 0) return SPAWN_COL
  const kicks = getKicks(type, 0, targetRot)
  for (const [dc, dr] of kicks) {
    const col = SPAWN_COL + dc
    const row = SPAWN_ROW + dr
    if (fitsAtSpawn(board, PIECES[type][targetRot], row, col)) return col
  }
  return SPAWN_COL
}

function movesToPlace(board: Board, type: PieceType, targetRot: number, targetCol: number): string[] {
  const actions: string[] = []
  const rotDiff = (targetRot + 4) % 4
  if (rotDiff === 1) actions.push('rotate_cw')
  else if (rotDiff === 2) actions.push('rotate_180')
  else if (rotDiff === 3) actions.push('rotate_ccw')

  const dc = targetCol - spawnColAfterRotation(board, type, targetRot)
  for (let i = 0; i < Math.abs(dc); i++) {
    actions.push(dc > 0 ? 'move_right' : 'move_left')
  }
  actions.push('hard_drop')
  return actions
}

let jsBoard: Board = emptyBoard()
let currentPiece: PieceType = 'I'
let nextQueue: PieceType[] = []
let wasmBot: any = null

async function tryLoadWasm(piece: PieceType, next: PieceType[]) {
  try {
    // @ts-ignore
    const mod = await import(/* webpackIgnore: true */ '/wasm/cold-clear.js')
    await mod.default()
    wasmBot = mod.BotHandle.create({}, piece, next)
    self.postMessage({ type: 'ready' })
  } catch {
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
      nextQueue = [...msg.next]
      await tryLoadWasm(msg.piece, msg.next)
      break

    case 'addPiece':
      currentPiece = msg.piece
      wasmBot?.addNextPiece(msg.piece)
      break

    case 'requestMove': {
      // sync board and next queue from engine if provided — prevents divergence
      if (msg.board) {
        jsBoard = msg.board.map(row => row.map(c => (c ? 1 : 0)))
      }
      if (msg.next) nextQueue = [...msg.next]
      if (wasmBot) {
        const result = wasmBot.nextMove({})
        if (result) {
          const actions = (result.inputs as string[]).map(i => CC_TO_ACTION[i] ?? i)
          self.postMessage({ type: 'move', actions, hold: result.hold })
          break
        }
      }
      // El-Tetris with 2-piece lookahead when next piece is known
      const { col, rot } = nextQueue[0]
        ? bestMove2(jsBoard, currentPiece, nextQueue[0])
        : bestMove(jsBoard, currentPiece)
      const actions = movesToPlace(jsBoard, currentPiece, rot, col)
      const minos = PIECES[currentPiece]?.[rot] ?? []
      const row = drop(jsBoard, minos, col)
      if (fits(jsBoard, minos, row, col)) {
        jsBoard = place(jsBoard, minos, row, col).board
      }
      self.postMessage({ type: 'move', actions, hold: false })
      break
    }

    case 'reset':
      jsBoard = emptyBoard()
      currentPiece = msg.piece
      nextQueue = [...msg.next]
      wasmBot = null
      await tryLoadWasm(msg.piece, msg.next)
      break
  }
})
