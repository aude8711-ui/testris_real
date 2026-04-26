type PieceChar = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'G'

interface InitMsg  { type: 'init';      piece: PieceChar; next: PieceChar[] }
interface AddMsg   { type: 'addPiece';  piece: PieceChar }
interface ReqMsg   { type: 'requestMove' }
interface ResetMsg { type: 'reset';     piece: PieceChar; next: PieceChar[] }

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

let bot: any = null
let ready = false

async function initBot(piece: PieceChar, next: PieceChar[]) {
  // @ts-ignore — WASM module, no TS types available
  const module = await import(/* webpackIgnore: true */ '/wasm/cold-clear.js')
  await module.default()
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
