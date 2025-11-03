// backend/models/db.js
const path = require('path');
const mysql = require('mysql2/promise');

// Always load the .env from backend/.env (or project root if you place it there)
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

// ---- Env validation ----
const required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  // Don't throw raw env values, just which keys are missing.
  console.error('❌ Missing required DB environment variables:', missing.join(', '));
  process.exit(1);
}

// Optional vars
const DB_PORT = Number(process.env.DB_PORT || 3306);

// ---- Pool config ----
// Notes:
// - dateStrings: true → avoid implicit local-time conversions in JS
// - supportBigNumbers/bigNumberStrings: true → safe for BIGINT/DECIMAL
// - timezone: 'Z' → store/retrieve in UTC
// - multipleStatements: false → safer against query injection chains
// - namedPlaceholders: true → allows :name style parameters if you want later
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: false,
  timezone: 'Z',
  namedPlaceholders: true,
});

// ---- One-time connectivity check ----
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MySQL connection OK');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
})();

// ---- Graceful shutdown ----
const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} received. Closing MySQL pool...`);
    await pool.end();
    console.log('✅ MySQL pool closed. Bye!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during MySQL pool shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = pool;
