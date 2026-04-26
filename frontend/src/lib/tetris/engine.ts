import { PieceType } from './pieces'

export type GameBoard = (PieceType | null)[][]
export interface ActivePiece {
  type: PieceType
  rotation: number
  row: number
  col: number
}
