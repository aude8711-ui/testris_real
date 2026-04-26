const { randomUUID } = require('crypto')
const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
const { registerGame } = require('./game')

function registerRoomHandlers(io, socket, userId) {
  socket.on('room:join', async ({ code, password }) => {
    const row = await pool.query('SELECT * FROM rooms WHERE code = $1', [code])
    if (!row.rows.length) return socket.emit('room:error', 'Room not found')
    const room = row.rows[0]
    if (room.status !== 'waiting') return socket.emit('room:error', 'Game already started')
    if (room.password_hash && !(await bcrypt.compare(password ?? '', room.password_hash)))
      return socket.emit('room:error', 'Wrong password')

    await pool.query(
      'INSERT INTO room_players (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [room.id, userId]
    )
    socket.join(code)
    io.to(code).emit('room:update', await getRoomState(code))
  })

  socket.on('room:leave', async ({ code }) => {
    socket.leave(code)
    await pool.query(
      'DELETE FROM room_players WHERE room_id = (SELECT id FROM rooms WHERE code=$1) AND user_id=$2',
      [code, userId]
    )
    io.to(code).emit('room:update', await getRoomState(code))
  })

  socket.on('room:start', async ({ code }) => {
    const row = await pool.query('SELECT * FROM rooms WHERE code = $1 AND host_id = $2', [code, userId])
    if (!row.rows.length) return socket.emit('room:error', 'Not host')
    const room = row.rows[0]

    const players = await pool.query('SELECT user_id FROM room_players WHERE room_id = $1', [room.id])
    if (players.rows.length < 2) return socket.emit('room:error', 'Need at least 2 players')

    await pool.query("UPDATE rooms SET status='playing' WHERE id=$1", [room.id])
    const sessionId = randomUUID()

    const roomSockets = [...io.sockets.sockets.values()].filter(s => s.rooms.has(code))
    const playerList = players.rows.slice(0, 2).map((p, i) => ({
      socketId: roomSockets[i]?.id ?? '',
      userId:   p.user_id,
    }))
    registerGame(sessionId, playerList, false, room.id)

    io.to(code).emit('game:start', { sessionId, roomCode: code })
  })
}

async function getRoomState(code) {
  const result = await pool.query(`
    SELECT r.*, array_agg(u.nickname) AS players
    FROM rooms r
    LEFT JOIN room_players rp ON rp.room_id = r.id
    LEFT JOIN users u ON u.id = rp.user_id
    WHERE r.code = $1
    GROUP BY r.id
  `, [code])
  return result.rows[0] ?? null
}

module.exports = { registerRoomHandlers }
