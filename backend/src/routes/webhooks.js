const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const pool = require('../db/pool')
const config = require('../config')

function verifySignature(rawBody, signature) {
  if (!signature || !config.POLAR_WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', config.POLAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

router.post('/polar', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['webhook-signature'] ?? req.headers['x-polar-signature']
  if (!verifySignature(req.body, signature))
    return res.status(400).json({ error: 'Invalid signature' })

  const event = JSON.parse(req.body.toString())
  const { type, data } = event

  try {
    if (type === 'subscription.created' || type === 'subscription.updated') {
      const { id: polarSubId, status, current_period_start, current_period_end } = data
      const user = await pool.query('SELECT id FROM users WHERE email = $1', [data.customer?.email])
      if (user.rows.length) {
        const userId = user.rows[0].id
        const isActive = status === 'active'
        await pool.query(`
          INSERT INTO subscriptions (user_id, polar_subscription_id, status, plan, current_period_start, current_period_end)
          VALUES ($1, $2, $3, 'pro', $4, $5)
          ON CONFLICT (polar_subscription_id) DO UPDATE SET
            status=$3, current_period_start=$4, current_period_end=$5, updated_at=NOW()
        `, [userId, polarSubId, status, current_period_start, current_period_end])
        await pool.query('UPDATE users SET is_paid=$1, updated_at=NOW() WHERE id=$2', [isActive, userId])
      }
    }

    if (type === 'subscription.revoked' || type === 'subscription.canceled') {
      await pool.query(
        'UPDATE subscriptions SET status=$1, updated_at=NOW() WHERE polar_subscription_id=$2',
        [data.status, data.id]
      )
      const sub = await pool.query('SELECT user_id FROM subscriptions WHERE polar_subscription_id=$1', [data.id])
      if (sub.rows.length) {
        await pool.query('UPDATE users SET is_paid=false, updated_at=NOW() WHERE id=$1', [sub.rows[0].user_id])
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

module.exports = router
