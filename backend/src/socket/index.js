const jwt = require('jsonwebtoken')
const config = require('../config')
const { joinQueue, leaveQueue } = require('./matchmaking')
const { handleGameOver } = require('./game')
const { registerRoomHandlers } = require('./room')

module.exports = function registerSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.data.user = jwt.verify(token, config.NEXTAUTH_SECRET)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.user.id
    const tr = socket.data.user.tr ?? 0

    socket.on('mm:join', ({ ranked }) => joinQueue(socket, userId, tr, !!ranked))
    socket.on('mm:leave', () => leaveQueue(socket.id))

    socket.on('game:board', ({ sessionId, board, combo, b2b }) => {
      socket.to(sessionId).emit('game:board', { board, combo, b2b })
    })

    socket.on('game:garbage', ({ sessionId, lines }) => {
      socket.to(sessionId).emit('game:garbage', { lines })
    })

    socket.on('game:over', async ({ sessionId, ranked, roomId }) => {
      await handleGameOver({ io, sessionId, loserUserId: userId, isRanked: !!ranked, roomId })
    })

    registerRoomHandlers(io, socket, userId)

    socket.on('disconnect', () => leaveQueue(socket.id))
  })
}
