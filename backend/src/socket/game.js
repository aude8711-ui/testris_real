const pool = require('../db/pool')

const K_TABLE = [
  { minTR: 4000, K: 20 },
  { minTR: 2000, K: 30 },
  { minTR: 0,    K: 40 },
]

function kFactor(tr) {
  return (K_TABLE.find(e => tr >= e.minTR) ?? K_TABLE[K_TABLE.length - 1]).K
}

function tierFromTR(tr) {
  if (tr >= 6000) return 'X'
  if (tr >= 5000) return 'SS'
  if (tr >= 4000) return 'S'
  if (tr >= 3000) return 'A'
  if (tr >= 2000) return 'B'
  if (tr >= 1000) return 'C'
  return 'D'
}

function calculateTR(p1TR, p2TR, winner) {
  const exp1 = 1 / (1 + Math.pow(10, (p2TR - p1TR) / 400))
  const exp2 = 1 - exp1
  const score1 = winner === 'p1' ? 1 : 0
  const score2 = 1 - score1
  const k1 = kFactor(p1TR)
  const k2 = kFactor(p2TR)
  return {
    p1After: Math.max(0, Math.round(p1TR + k1 * (score1 - exp1))),
    p2After: Math.max(0, Math.round(p2TR + k2 * (score2 - exp2))),
  }
}

// in-memory sessions: sessionId → { players: [{socketId, userId}], ranked, roomId }
const sessions = new Map()

async function handleGameOver({ io, sessionId, loserUserId, isRanked, roomId }) {
  const session = sessions.get(sessionId)
  if (!session) return
  sessions.delete(sessionId)

  const winner = session.players.find(p => p.userId !== loserUserId)
  const loser  = session.players.find(p => p.userId === loserUserId)
  if (!winner || !loser) return
  const winnerId = winner.userId
  const loserId  = loser.userId

  io.to(sessionId).emit('game:result', { winnerId, loserId })

  if (!isRanked) return

  const [p1Row, p2Row] = await Promise.all([
    pool.query('SELECT tr FROM ranks WHERE user_id = $1', [winnerId]),
    pool.query('SELECT tr FROM ranks WHERE user_id = $1', [loserId]),
  ])
  const p1TR = p1Row.rows[0]?.tr ?? 0
  const p2TR = p2Row.rows[0]?.tr ?? 0
  const { p1After, p2After } = calculateTR(p1TR, p2TR, 'p1')

  await Promise.all([
    pool.query(`
      INSERT INTO ranks (user_id, tr, tier, wins, games_played, peak_tr, peak_tier)
        VALUES ($1, $2, $3, 1, 1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        tr = $2, tier = $3, wins = ranks.wins + 1,
        games_played = ranks.games_played + 1,
        peak_tr = GREATEST(ranks.peak_tr, $2),
        peak_tier = CASE WHEN $2 > ranks.peak_tr THEN $3 ELSE ranks.peak_tier END,
        updated_at = NOW()
    `, [winnerId, p1After, tierFromTR(p1After)]),
    pool.query(`
      INSERT INTO ranks (user_id, tr, tier, losses, games_played, peak_tr, peak_tier)
        VALUES ($1, $2, $3, 1, 1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        tr = $2, tier = $3, losses = ranks.losses + 1,
        games_played = ranks.games_played + 1,
        updated_at = NOW()
    `, [loserId, p2After, tierFromTR(p2After)]),
  ])

  await pool.query(`
    INSERT INTO game_records
      (player1_id, player2_id, winner_id, is_ranked, p1_tr_before, p1_tr_after, p2_tr_before, p2_tr_after)
    VALUES ($1, $2, $3, true, $4, $5, $6, $7)
  `, [winnerId, loserId, winnerId, p1TR, p1After, p2TR, p2After])

  io.to(sessionId).emit('game:trUpdate', {
    [winnerId]: { before: p1TR, after: p1After },
    [loserId]:  { before: p2TR, after: p2After },
  })
}

function registerGame(sessionId, players, ranked, roomId = null) {
  sessions.set(sessionId, { players, ranked, roomId })
}

module.exports = { calculateTR, tierFromTR, handleGameOver, registerGame }
