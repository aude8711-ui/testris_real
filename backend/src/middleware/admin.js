const auth = require('./auth')

function adminMiddleware(req, res, next) {
  auth(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Forbidden' })
    next()
  })
}

module.exports = adminMiddleware
