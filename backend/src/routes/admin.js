const router = require('express').Router()
const pool = require('../db/pool')
const admin = require('../middleware/admin')

router.get('/users', admin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit
  const rows = await pool.query(`
    SELECT u.id, u.email, u.nickname, u.guest_tag, u.is_paid, u.is_banned, u.is_admin, u.created_at,
           r.tier, r.tr, r.games_played
    FROM users u
    LEFT JOIN ranks r ON r.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])
  res.json(rows.rows)
})

router.post('/users/:id/ban', admin, async (req, res) => {
  await pool.query('UPDATE users SET is_banned=true, updated_at=NOW() WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

router.post('/users/:id/unban', admin, async (req, res) => {
  await pool.query('UPDATE users SET is_banned=false, updated_at=NOW() WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

router.get('/system/maintenance-status', async (req, res) => {
  const row = await pool.query("SELECT value FROM system_settings WHERE key='maintenance_mode'")
  res.json({ enabled: row.rows[0]?.value === 'true' })
})

router.post('/system/maintenance', admin, async (req, res) => {
  const { enabled } = req.body
  await pool.query(
    "UPDATE system_settings SET value=$1 WHERE key='maintenance_mode'",
    [String(!!enabled)]
  )
  res.json({ ok: true, enabled: !!enabled })
})

module.exports = router
