// src/server.js
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const config = require('./config')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: config.FRONTEND_URL, credentials: true },
})

app.use(cors({ origin: config.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60_000, max: 100 }))

app.use('/auth', require('./routes/auth'))
app.use('/users', require('./routes/users'))
app.use('/rooms', require('./routes/rooms'))
app.use('/subscriptions', require('./routes/subscriptions'))
app.use('/webhooks', require('./routes/webhooks'))
app.use('/admin', require('./routes/admin'))

app.get('/health', (_, res) => res.json({ ok: true }))

require('./socket')(io)

httpServer.listen(config.PORT, () =>
  console.log(`Server running on port ${config.PORT}`)
)

module.exports = { app, io }
