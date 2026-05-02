# vs AI Redesign

## Goal

Fix `/game` page so each participant (1 player + 1–3 bots) has its own independent board and game loop. Bot count is configurable before the game starts.

## Layout

```
┌─────────────────────────────────────────┐
│  [Hold]  [Player Board 32px]  [Next]  │ [Bot 1]  │
│                                        │ [Bot 2]  │
│                                        │ [Bot 3]  │
└─────────────────────────────────────────┘
```

- **Player panel** (left): HoldPiece + GameBoard (32px cells) + NextQueue — unchanged
- **Bot column** (right): 1–3 GameBoard-only panels stacked vertically, no Hold/Next
- Bot cell sizes scale to fill the same height as the player board (640px):
  - 1 bot → 30px cells
  - 2 bots → 16px cells
  - 3 bots → 10px cells
- Dead bot board shows a semi-transparent "GAME OVER" overlay

## Screens

### Config screen (`phase === 'config'`)
- Title: "vs AI"
- Bot count selector: 1 / 2 / 3 toggle buttons
- "Start" button → transitions to `phase === 'playing'`

### Game screen (`phase === 'playing'`)
- Player panel + bot column rendered side-by-side
- On all bots topped out: show "You Win!" result overlay
- On player topped out: show "Game Over" result overlay
- "Play Again" button resets to config screen

## Components

### `GameBoard` (modified)
- Add `cellSize?: number` prop (default 32)
- Use `cellSize` instead of hardcoded `CELL = 32`

### `BotPanel` (new — `src/components/game/BotPanel.tsx`)
- Props: `cellSize: number`, `running: boolean`, `label: string`
- Manages its own:
  - `GameEngine` instance (useRef)
  - `useBot` worker hook
  - Gravity interval (800ms)
  - Bot move application interval (200ms)
- On `running` goes false: clears all intervals, terminates worker
- Renders: `<GameBoard cellSize={cellSize} />` + GAME OVER overlay when `state.topOut`
- Exposes topped-out state via `onTopOut` callback prop

### `GamePage` (rewritten — `src/app/game/page.tsx`)
- State: `phase: 'config' | 'playing'`, `botCount: 1 | 2 | 3`
- Config screen renders bot count buttons + Start
- Game screen renders player panel + `botCount` BotPanel instances
- Tracks how many bots have topped out → triggers win condition

## Bot cell size calculation

```ts
const BOT_CELL = botCount === 1 ? 30 : botCount === 2 ? 16 : 10
```

## What is NOT changing

- `GameEngine`, `useBot`, `HoldPiece`, `NextQueue`, `OpponentBoard` — untouched
- No attack/garbage between player and bots (deferred to future)
- No ranking or backend calls
