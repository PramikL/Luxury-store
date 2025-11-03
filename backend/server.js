// backend/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

/* ------------------------------- CORS ---------------------------------- */
// Allow a comma-separated list in FRONTEND_ORIGIN, e.g. "http://localhost:5173,https://myapp.com"
const allowList = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = allowList.length
  ? { origin: allowList, credentials: true }
  : { origin: true, credentials: true }; // dev fallback

app.use(cors(corsOptions));

/* --------------------------- Parsers & Static -------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images from backend/uploads at /uploads/*
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

/* --------------------------------- API -------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);

// 🔐 Admin endpoints (protected by adminAuth inside the router)
app.use('/api/admin', adminRoutes);

/* ------------------------------ Healthcheck ---------------------------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

/* -------------------------- 404 & Error Handler ------------------------ */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  return next();
});

// Central error handler (keeps JSON responses consistent)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

/* --------------------------------- Boot -------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
