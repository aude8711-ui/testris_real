// src/db/pool.js
const { Pool } = require('pg')
const config = require('../config')

const dbUrl = config.DATABASE_URL || ''
const isLocalDb = /localhost|127\.0\.0\.1/.test(dbUrl)
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: (config.NODE_ENV === 'production' && !isLocalDb) ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err)
  process.exit(1)
})

module.exports = pool
