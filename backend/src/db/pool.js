// src/db/pool.js
const { Pool } = require('pg')
const config = require('../config')

const isInternalHost = config.DATABASE_URL?.includes('.railway.internal')
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: (config.NODE_ENV === 'production' && !isInternalHost) ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err)
  process.exit(1)
})

module.exports = pool
