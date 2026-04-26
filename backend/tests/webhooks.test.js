const request = require('supertest')
const { app } = require('../src/server')

describe('POST /webhooks/polar', () => {
  it('rejects missing signature', async () => {
    const res = await request(app)
      .post('/webhooks/polar')
      .send({ type: 'subscription.created', data: {} })
    expect(res.status).toBe(400)
  })
})
