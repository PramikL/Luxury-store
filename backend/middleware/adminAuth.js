// backend/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const db = require('../models/db');

module.exports = async function adminAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // fetch user to confirm role (trust DB, not token)
    const [rows] = await db.query('SELECT id, role FROM users WHERE id=?', [payload.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid/expired token' });
  }
};
