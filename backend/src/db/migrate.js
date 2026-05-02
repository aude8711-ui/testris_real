// src/db/migrate.js
const fs = require('fs')
const path = require('path')
const pool = require('./pool')

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)

  const { rows } = await pool.query('SELECT filename FROM schema_migrations')
  const applied = new Set(rows.map(r => r.filename))

  const dir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipped (already applied): ${file}`)
      continue
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
    console.log(`Migrated: ${file}`)
  }

  await pool.end()
}

migrate().catch(console.error)
