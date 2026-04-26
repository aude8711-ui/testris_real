// src/db/pool.js
const { Pool } = require('pg')
const config = require('../config')

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

module.exports = pool
