// src/config.js
require('dotenv').config()

module.exports = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
  POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
  POLAR_PRODUCT_ID: process.env.POLAR_PRODUCT_ID,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
}
