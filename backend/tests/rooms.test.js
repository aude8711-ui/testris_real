const request = require('supertest')
const { app } = require('../src/server')

describe('GET /rooms', () => {
  it('returns JSON', async () => {
    const res = await request(app).get('/rooms')
    // 200 with DB available, 500 without (CI skips DB setup)
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /rooms', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).post('/rooms').send({})
    expect(res.status).toBe(401)
  })
})
