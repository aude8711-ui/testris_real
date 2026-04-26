const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

router.get('/me', auth, async (req, res) => {
  const row = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [req.user.id]
  )
  res.json(row.rows[0] ?? null)
})

module.exports = router
