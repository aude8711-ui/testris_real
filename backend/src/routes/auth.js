const router = require('express').Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

router.post('/sync', async (req, res) => {
  const { google_id, email } = req.body
  if (!google_id || !email) return res.status(400).json({ error: 'Missing fields' })

  try {
    let user = await pool.query(
      'SELECT * FROM users WHERE google_id = $1', [google_id]
    )

    if (user.rows.length === 0) {
      const guest_tag = 'guest' + Math.floor(1000 + Math.random() * 9000)
      user = await pool.query(
        `INSERT INTO users (google_id, email, guest_tag)
         VALUES ($1, $2, $3) RETURNING *`,
        [google_id, email, guest_tag]
      )
    }

    const u = user.rows[0]
    res.json({
      id: u.id,
      guest_tag: u.guest_tag,
      nickname: u.nickname,
      is_paid: u.is_paid,
      is_admin: u.is_admin,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/logout', auth, (req, res) => {
  res.json({ ok: true })
})

module.exports = router
