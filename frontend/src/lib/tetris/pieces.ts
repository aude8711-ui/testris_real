export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

// Row coords are Y-up (row 0 = board bottom, higher row = screen top).
// CW rotation formula: (r,c) → (2-c, r) for 3×3; (r,c) → (3-c, r) for I 4×4.
// State 0=spawn, 1=CW, 2=180°, 3=CCW.
export const PIECES: Record<PieceType, number[][][]> = {
  I: [
    [[2,0],[2,1],[2,2],[2,3]],   // horizontal at row 2 (SRS spawn row)
    [[0,2],[1,2],[2,2],[3,2]],   // vertical at col 2 (CW)
    [[1,0],[1,1],[1,2],[1,3]],   // horizontal at row 1
    [[0,1],[1,1],[2,1],[3,1]],   // vertical at col 1 (CCW)
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[1,0],[1,1],[1,2],[2,1]],   // .T./TTT  bump up (uses box rows 1-2)
    [[0,1],[1,1],[1,2],[2,1]],   // .T./.TT/.T.  bump right (CW)
    [[0,1],[1,0],[1,1],[1,2]],   // TTT/.T.  bump down (uses box rows 0-1)
    [[0,1],[1,0],[1,1],[2,1]],   // .T./TT./.T.  bump left (CCW)
  ],
  S: [
    [[1,0],[1,1],[2,1],[2,2]],   // .SS/SS.  spawn (uses box rows 1-2)
    [[0,2],[1,1],[1,2],[2,1]],   // .S./.SS/..S  (CW)
    [[0,0],[0,1],[1,1],[1,2]],   // .SS/SS.  (uses box rows 0-1)
    [[0,1],[1,0],[1,1],[2,0]],   // S../SS./.S.  (CCW)
  ],
  Z: [
    [[1,1],[1,2],[2,0],[2,1]],   // ZZ./.ZZ  spawn (uses box rows 1-2)
    [[0,1],[1,1],[1,2],[2,2]],   // ..Z/.ZZ/.Z.  (CW)
    [[0,1],[0,2],[1,0],[1,1]],   // ZZ./.ZZ  (uses box rows 0-1)
    [[0,0],[1,0],[1,1],[2,1]],   // .Z./ZZ./Z..  (CCW)
  ],
  J: [
    [[1,0],[1,1],[1,2],[2,0]],   // J../JJJ  spawn (uses box rows 1-2)
    [[0,1],[1,1],[2,1],[2,2]],   // JJ./.J./.J.  (CW)
    [[0,2],[1,0],[1,1],[1,2]],   // JJJ/..J  (uses box rows 0-1)
    [[0,0],[0,1],[1,1],[2,1]],   // .J./.J./JJ.  (CCW)
  ],
  L: [
    [[1,0],[1,1],[1,2],[2,2]],   // ..L/LLL  spawn (uses box rows 1-2)
    [[0,1],[0,2],[1,1],[2,1]],   // .L./.L./.LL  (CW)
    [[0,0],[1,0],[1,1],[1,2]],   // LLL/L..  (uses box rows 0-1)
    [[0,1],[1,1],[2,0],[2,1]],   // LL./.L./.L.  (CCW)
  ],
  G: [[[0,0]]],
}

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
  G: '#888888',
}

export const PIECE_TYPES: PieceType[] = ['I','O','T','S','Z','J','L']  // 'G' excluded — garbage only, never spawned
