// ColdClear WASM Web Worker
// Tries to load ColdClear WASM; falls back to El-Tetris (Dellacherie) bot.

type PieceChar = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

interface InitMsg  { type: 'init';       piece: PieceChar; next: PieceChar[]; board?: number[][] }
interface AddMsg   { type: 'addPiece';   piece: PieceChar }
interface ReqMsg   { type: 'requestMove'; board?: number[][]; next?: PieceChar[] }
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

// Mino data must match engine PIECES exactly
const MINOS: Record<PieceChar, [number, number][][]> = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,0],[0,1],[0,2],[1,1]],
    [[0,0],[1,0],[1,1],[2,0]],
    [[1,1],[2,0],[2,1],[2,2]],
    [[0,2],[1,1],[1,2],[2,2]],
  ],
  S: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[1,0],[1,1],[2,0]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,2],[1,1],[1,2],[2,1]],
  ],
  Z: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,1],[1,1],[1,2],[2,2]],
  ],
  J: [
    [[0,0],[0,1],[0,2],[1,0]],
    [[0,0],[1,0],[2,0],[2,1]],
    [[1,2],[2,0],[2,1],[2,2]],
    [[0,1],[0,2],[1,2],[2,2]],
  ],
  L: [
    [[0,0],[0,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,0],[2,0]],
    [[1,0],[2,0],[2,1],[2,2]],
    [[0,2],[1,2],[2,1],[2,2]],
  ],
  G: [[[0,0]]],
}

const COLS = 10
const ROWS = 20

type Board = number[][]  // row 0 = bottom, row 19 = top

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

function place(board: Board, minos: [number, number][], row: number, col: number): PlaceResult {
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

function bestMove(board: Board, type: PieceChar): { col: number; rot: number } {
  const rotations = MINOS[type]?.length ?? 1
  let best = -Infinity, bestCol = 0, bestRot = 0
  for (let rot = 0; rot < rotations; rot++) {
    const minos = MINOS[type]?.[rot] ?? []
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
function bestScore(board: Board, type: PieceChar): number {
  const rotations = MINOS[type]?.length ?? 1
  let best = -Infinity
  for (let rot = 0; rot < rotations; rot++) {
    const minos = MINOS[type]?.[rot] ?? []
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
function bestMove2(board: Board, type: PieceChar, nextType: PieceChar): { col: number; rot: number } {
  const rotations = MINOS[type]?.length ?? 1
  let best = -Infinity, bestCol = 0, bestRot = 0
  for (let rot = 0; rot < rotations; rot++) {
    const minos = MINOS[type]?.[rot] ?? []
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

// At spawn (row=17, col=3), SRS kick shifts I-piece vertical rotations:
//   rot=1 (CW):  kick [+1,-2] → actual col = 4
//   rot=3 (CCW): kick [-1,-2] → actual col = 2
// All other pieces / rotations: no kick at spawn, col stays 3.
function spawnColAfterRotation(type: PieceChar, rot: number): number {
  if (type !== 'I') return 3
  if (rot === 1) return 4
  if (rot === 3) return 2
  return 3
}

function movesToPlace(type: PieceChar, targetRot: number, targetCol: number): string[] {
  const actions: string[] = []
  const rotDiff = (targetRot + 4) % 4
  if (rotDiff === 1) actions.push('rotate_cw')
  else if (rotDiff === 2) actions.push('rotate_180')
  else if (rotDiff === 3) actions.push('rotate_ccw')

  const dc = targetCol - spawnColAfterRotation(type, targetRot)
  for (let i = 0; i < Math.abs(dc); i++) {
    actions.push(dc > 0 ? 'move_right' : 'move_left')
  }
  actions.push('hard_drop')
  return actions
}

let jsBoard: Board = emptyBoard()
let currentPiece: PieceChar = 'I'
let nextQueue: PieceChar[] = []
let wasmBot: any = null

async function tryLoadWasm(piece: PieceChar, next: PieceChar[]) {
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
      const actions = movesToPlace(currentPiece, rot, col)
      const minos = MINOS[currentPiece]?.[rot] ?? []
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
