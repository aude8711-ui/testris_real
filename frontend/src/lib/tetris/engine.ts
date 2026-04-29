import { PieceType, PIECES } from './pieces'
import { SevenBag } from './randomizer'
import { tryRotate, fitsOnBoard } from './rotation'

export type GameBoard = (PieceType | null)[][]
export interface ActivePiece {
  type: PieceType
  rotation: number
  row: number
  col: number
}

export interface GarbageChunk { lines: number; col: number }

export interface GameState {
  board: GameBoard
  active: ActivePiece | null
  hold: PieceType | null
  holdUsed: boolean
  next: PieceType[]
  combo: number
  b2b: number   // 0 = no B2B, 1+ = B2B count
  linesCleared: number
  topOut: boolean
  garbageQueue: GarbageChunk[]
  lastLock: LockResult | null
}

export interface LockResult {
  linesCleared: number
  tSpin: 'none' | 'mini' | 'full'
  allClear: boolean
  combo: number
  b2b: number   // B2B count before this lock (0 = no B2B active)
  surge: number // B2B Surge lines fired this lock (> 0 when B2B chain ≥ 4 breaks)
}

const BOARD_ROWS = 20
const BOARD_COLS = 10
const NEXT_COUNT = 5
const SPAWN_ROW = 17  // all piece rotation-0 minos fit within [0,19] at this row

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
  private lastRotation = false

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
      b2b: 0,
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
    this.lastRotation = false
    if (this.lockTimer) this.resetLock()
    return true
  }

  rotate(dir: 1 | -1 | 2): boolean {
    const { active, board } = this.state
    if (!active) return false
    const result = tryRotate(active, dir, board)
    if (!result) return false
    this.state.active = result
    this.lastRotation = true
    if (this.lockTimer) this.resetLock()
    return true
  }

  softDrop(byPlayer = false): boolean {
    const { active, board } = this.state
    if (!active) return false
    const moved = { ...active, row: active.row - 1 }
    if (!fitsOnBoard(moved, board)) return false
    this.state.active = moved
    if (byPlayer) this.lastRotation = false
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
    this.lastRotation = false
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

    for (const [r, c] of PIECES[active.type][active.rotation]) {
      const row = active.row + r
      const col = active.col + c
      if (row >= 0 && row < BOARD_ROWS) board[row][col] = active.type
    }

    const tSpin = this.detectSpin(active)
    this.lastRotation = false

    const cleared: number[] = []
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[r].every(cell => cell !== null)) cleared.push(r)
    }
    for (const r of cleared.reverse()) {
      board.splice(r, 1)
      board.push(Array(BOARD_COLS).fill(null))
    }

    // absorb queued garbage with cleared lines
    let toAbsorb = cleared.length
    while (toAbsorb > 0 && this.state.garbageQueue.length) {
      const chunk = this.state.garbageQueue[0]
      if (chunk.lines <= toAbsorb) {
        toAbsorb -= chunk.lines
        this.state.garbageQueue.shift()
      } else {
        this.state.garbageQueue[0] = { ...chunk, lines: chunk.lines - toAbsorb }
        toAbsorb = 0
      }
    }
    // remaining garbage always rises at lock time
    for (const chunk of this.state.garbageQueue) {
      this.addGarbage(chunk.lines, chunk.col)
    }
    this.state.garbageQueue = []

    const allClear = board.every(row => row.every(c => c === null))
    const isB2bMove = cleared.length === 4 || (tSpin !== 'none' && cleared.length > 0)
    const prevB2b = this.state.b2b
    const b2bBroken = !isB2bMove && cleared.length > 0 && prevB2b > 0
    const surge = b2bBroken && prevB2b >= 4 ? prevB2b : 0
    if (isB2bMove) {
      this.state.b2b = prevB2b + 1
    } else if (cleared.length > 0) {
      this.state.b2b = 0
    }

    const combo = cleared.length > 0 ? this.state.combo + 1 : 0
    this.state.combo = combo
    this.state.linesCleared += cleared.length

    const result: LockResult = { linesCleared: cleared.length, tSpin, allClear, combo, b2b: prevB2b, surge }
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

  private addGarbage(lines: number, col: number) {
    for (let i = 0; i < lines; i++) {
      const row: (PieceType | null)[] = Array(BOARD_COLS).fill('G' as PieceType)
      row[col] = null
      this.state.board.unshift(row)
      this.state.board.pop()
    }
  }

  receiveGarbage(lines: number) {
    const col = Math.floor(Math.random() * BOARD_COLS)
    this.state.garbageQueue.push({ lines, col })
  }

  private detectSpin(piece: ActivePiece): 'none' | 'mini' | 'full' {
    if (!this.lastRotation) return 'none'

    if (piece.type === 'T') {
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
      const front = this.tFrontCorners(piece)
      const frontFilled = front.filter(([r, c]) =>
        r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS || this.state.board[r][c] !== null
      ).length
      return frontFilled >= 2 ? 'full' : 'mini'
    }

    // All-Spin: immobile check (can't move left, right, or down)
    const { board } = this.state
    const immobile =
      !fitsOnBoard({ ...piece, col: piece.col - 1 }, board) &&
      !fitsOnBoard({ ...piece, col: piece.col + 1 }, board) &&
      !fitsOnBoard({ ...piece, row: piece.row - 1 }, board)
    return immobile ? 'full' : 'none'
  }

  private tFrontCorners(piece: ActivePiece): [number, number][] {
    const { row, col, rotation } = piece
    const fronts: Record<number, [number, number][]> = {
      0: [[row + 2, col], [row + 2, col + 2]], // bump up → top corners
      1: [[row, col + 2], [row + 2, col + 2]], // bump right → right corners
      2: [[row, col], [row, col + 2]],          // bump down → bottom corners
      3: [[row, col], [row + 2, col]],          // bump left → left corners
    }
    return fronts[rotation]
  }

  pauseLock() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer)
      this.lockTimer = null
    }
  }

  resumeLock() {
    if (!this.state.active || this.lockTimer) return
    const { active, board } = this.state
    if (!fitsOnBoard({ ...active, row: active.row - 1 }, board)) {
      this.scheduleLock()
    }
  }

  getGhostRow(): number {
    if (!this.state.active) return 0
    return ghostRow(this.state.active, this.state.board)
  }
}
