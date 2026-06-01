export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

// Row coords are Y-up (row 0 = board bottom, higher row = screen top).
// CW rotation formula: (r,c) → (2-c, r) for 3×3; (r,c) → (3-c, r) for I 4×4.
// State 0=spawn, 1=CW, 2=180°, 3=CCW.
export const PIECES: Record<PieceType, number[][][]> = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],   // horizontal at row 1
    [[0,1],[1,1],[2,1],[3,1]],   // vertical at col 1 (CW)
    [[2,0],[2,1],[2,2],[2,3]],   // horizontal at row 2
    [[0,2],[1,2],[2,2],[3,2]],   // vertical at col 2 (CCW)
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,0],[0,1],[0,2],[1,1]],   // .T./TTT  bump up
    [[0,0],[1,0],[1,1],[2,0]],   // T../TT.  bump right (CW)
    [[1,1],[2,0],[2,1],[2,2]],   // TTT/.T.  bump down
    [[0,2],[1,1],[1,2],[2,2]],   // ..T/.TT  bump left (CCW)
  ],
  S: [
    [[0,0],[0,1],[1,1],[1,2]],   // .SS/SS.  spawn
    [[0,1],[1,0],[1,1],[2,0]],   // S../SS./.S.  (CW)
    [[1,0],[1,1],[2,1],[2,2]],   // .SS/SS.
    [[0,2],[1,1],[1,2],[2,1]],   // .S./.SS/..S  (CCW)
  ],
  Z: [
    [[0,1],[0,2],[1,0],[1,1]],   // ZZ./.ZZ
    [[0,0],[1,0],[1,1],[2,1]],   // .Z./ZZ./Z..  (CW)
    [[1,1],[1,2],[2,0],[2,1]],   // ZZ./.ZZ
    [[0,1],[1,1],[1,2],[2,2]],   // ..Z/.ZZ/.Z.  (CCW)
  ],
  J: [
    [[0,0],[0,1],[0,2],[1,0]],   // J../JJJ
    [[0,0],[1,0],[2,0],[2,1]],   // JJ./J../J..  (CW)
    [[1,2],[2,0],[2,1],[2,2]],   // JJJ/..J
    [[0,1],[0,2],[1,2],[2,2]],   // ..J/..J/.JJ  (CCW)
  ],
  L: [
    [[0,0],[0,1],[0,2],[1,2]],   // ..L/LLL
    [[0,0],[0,1],[1,0],[2,0]],   // L../L../LL.  (CW)
    [[1,0],[2,0],[2,1],[2,2]],   // LLL/L..
    [[0,2],[1,2],[2,1],[2,2]],   // .LL/..L/..L  (CCW)
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
