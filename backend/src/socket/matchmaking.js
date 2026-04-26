const { randomUUID } = require('crypto')
const { registerGame } = require('./game')

const rankedQueue = []
const casualQueue = []

function joinQueue(socket, userId, tr, ranked) {
  const queue = ranked ? rankedQueue : casualQueue
  if (queue.some(e => e.socketId === socket.id)) return
  queue.push({ socketId: socket.id, userId, tr })
  tryMatch(socket.server, queue, ranked)
}

function leaveQueue(socketId) {
  ;[rankedQueue, casualQueue].forEach(q => {
    const i = q.findIndex(e => e.socketId === socketId)
    if (i !== -1) q.splice(i, 1)
  })
}

function tryMatch(io, queue, ranked) {
  if (queue.length < 2) return
  const [a, b] = queue.splice(0, 2)
  const sessionId = randomUUID()

  const sA = io.sockets.sockets.get(a.socketId)
  const sB = io.sockets.sockets.get(b.socketId)
  if (!sA || !sB) return

  sA.join(sessionId)
  sB.join(sessionId)
  registerGame(
    sessionId,
    [{ socketId: a.socketId, userId: a.userId }, { socketId: b.socketId, userId: b.userId }],
    ranked
  )

  io.to(sessionId).emit('game:start', {
    sessionId,
    players: [
      { socketId: a.socketId, userId: a.userId },
      { socketId: b.socketId, userId: b.userId },
    ],
  })
}

module.exports = { joinQueue, leaveQueue }
