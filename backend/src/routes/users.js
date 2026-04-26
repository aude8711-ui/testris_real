const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

router.get('/:id', async (req, res) => {
  const user = await pool.query(`
    SELECT u.id, u.nickname, u.guest_tag, u.is_paid, u.created_at,
           r.tr, r.tier, r.wins, r.losses, r.games_played, r.peak_tr, r.peak_tier
    FROM users u
    LEFT JOIN ranks r ON r.user_id = u.id
    WHERE u.id = $1
  `, [req.params.id])
  if (!user.rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(user.rows[0])
})

router.patch('/me/nickname', auth, async (req, res) => {
  const { nickname } = req.body
  if (!nickname || !/^[a-zA-Z0-9_]{3,20}$/.test(nickname))
    return res.status(400).json({ error: 'Invalid nickname (3-20 alphanumeric chars)' })

  try {
    await pool.query('UPDATE users SET nickname=$1, updated_at=NOW() WHERE id=$2', [nickname, req.user.id])
    res.json({ ok: true })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Nickname taken' })
    throw e
  }
})

router.get('/me/settings', auth, async (req, res) => {
  const row = await pool.query('SELECT key_bindings FROM user_settings WHERE user_id=$1', [req.user.id])
  res.json({ key_bindings: row.rows[0]?.key_bindings ?? {} })
})

router.patch('/me/settings', auth, async (req, res) => {
  const { key_bindings } = req.body
  await pool.query(`
    INSERT INTO user_settings (user_id, key_bindings) VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET key_bindings=$2, updated_at=NOW()
  `, [req.user.id, JSON.stringify(key_bindings)])
  res.json({ ok: true })
})

module.exports = router
