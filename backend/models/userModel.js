// backend/models/userModel.js
const pool = require('./db');

// --- helpers ---------------------------------------------------------------

function normalizeRegisterInput({ username, email, hashedPassword, role = 'user' }) {
  const uname = String(username ?? '').trim();
  const mail = String(email ?? '').trim().toLowerCase();
  const pass = String(hashedPassword ?? '').trim();
  const r = String(role ?? 'user').trim();

  if (!uname) throw new Error('Username is required');
  if (!mail) throw new Error('Email is required');
  if (!pass) throw new Error('Password hash is required');
  if (!['user', 'admin'].includes(r)) throw new Error('Invalid role');

  return { username: uname, email: mail, hashedPassword: pass, role: r };
}

// --- CRUD ------------------------------------------------------------------

const registerUser = async (username, email, hashedPassword, role = 'user') => {
  const input = normalizeRegisterInput({ username, email, hashedPassword, role });
  const sql =
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
  const [result] = await pool.query(sql, [
    input.username,
    input.email,
    input.hashedPassword,
    input.role,
  ]);
  return result; // includes insertId
};

const getUserByEmail = async (email) => {
  const sql = 'SELECT id, username, email, password, role, created_at FROM users WHERE email = ?';
  const [rows] = await pool.query(sql, [String(email ?? '').trim().toLowerCase()]);
  return rows[0] || null;
};

const getAllUsers = async () => {
  const sql =
    'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC, id DESC';
  const [rows] = await pool.query(sql);
  return rows;
};

const getUserById = async (id) => {
  const sql =
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?';
  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
};

const updateUserPassword = async (id, hashedPassword) => {
  if (!hashedPassword) throw new Error('Password hash required');
  const sql = 'UPDATE users SET password = ? WHERE id = ?';
  const [result] = await pool.query(sql, [String(hashedPassword).trim(), id]);
  return result; // result.affectedRows
};

const deleteUser = async (id) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  const [result] = await pool.query(sql, [id]);
  return result;
};

const updateUserRole = async (id, role) => {
  const r = String(role ?? '').trim();
  if (!['user', 'admin'].includes(r)) throw new Error('Invalid role');
  const sql = 'UPDATE users SET role = ? WHERE id = ?';
  const [result] = await pool.query(sql, [r, id]);
  return result;
};

// --- optional helpers (handy for admin/search) -----------------------------
// Not used by default, but available if you need them later.

const getUserByUsername = async (username) => {
  const sql =
    'SELECT id, username, email, role, created_at FROM users WHERE username = ?';
  const [rows] = await pool.query(sql, [String(username ?? '').trim()]);
  return rows[0] || null;
};

const countUsers = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');
  return rows[0]?.total ?? 0;
};

module.exports = {
  registerUser,
  getUserByEmail,
  getAllUsers,
  getUserById,
  updateUserPassword,
  deleteUser,
  updateUserRole,
  // optional
  getUserByUsername,
  countUsers,
};
