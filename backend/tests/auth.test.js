const request = require('supertest')
const { app } = require('../src/server')

describe('POST /auth/sync', () => {
  it('rejects missing body', async () => {
    const res = await request(app).post('/auth/sync').send({})
    expect(res.status).toBe(400)
  })
})
