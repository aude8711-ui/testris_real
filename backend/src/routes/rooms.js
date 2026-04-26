const router = require('express').Router()
const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth')

router.get('/', async (req, res) => {
  const rows = await pool.query(`
    SELECT r.id, r.code, r.status, r.max_players, r.match_format,
           u.nickname AS host_nickname,
           COUNT(rp.user_id)::int AS player_count
    FROM rooms r
    LEFT JOIN users u ON u.id = r.host_id
    LEFT JOIN room_players rp ON rp.room_id = r.id
    WHERE r.password_hash IS NULL AND r.status = 'waiting'
    GROUP BY r.id, u.nickname
    ORDER BY r.created_at DESC
    LIMIT 50
  `)
  res.json(rows.rows)
})

router.get('/:code', async (req, res) => {
  const row = await pool.query('SELECT * FROM rooms WHERE code = $1', [req.params.code])
  if (!row.rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(row.rows[0])
})

router.post('/', auth, async (req, res) => {
  const { password, max_players = 2, match_format = 'single' } = req.body
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const hash = password ? await bcrypt.hash(password, 10) : null

  const row = await pool.query(`
    INSERT INTO rooms (code, host_id, password_hash, max_players, match_format)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [code, req.user.id, hash, max_players, match_format])

  await pool.query(
    'INSERT INTO room_players (room_id, user_id, role) VALUES ($1, $2, $3)',
    [row.rows[0].id, req.user.id, 'host']
  )
  res.json(row.rows[0])
})

module.exports = router
