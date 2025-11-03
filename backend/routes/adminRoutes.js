// backend/routes/adminRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

const router = express.Router();

/* ----------------------------- Multer setup ----------------------------- */
// Ensure uploads dir exists: backend/uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    // sanitize + unique name
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
                  .replace(/[^a-z0-9_-]/gi, '')
                  .slice(0, 40) || 'img';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (_req, file, cb) {
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }
});

/* -------------------------- Auth for all routes ------------------------- */
router.use(adminAuth);

/* ------------------------------ Dashboard ------------------------------ */
router.get('/dashboard', adminController.getDashboardStats);

/* ---------------------------- User Management --------------------------- */
router.get('/users', adminController.getAllUsers);
// You can keep PUT; PATCH is also fine.
router.put('/users/:userId/password', adminController.updateUserPassword);
router.put('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

/* --------------------------- Product Management ------------------------- */
router.get('/products', adminController.getAllProducts);
router.post('/products', upload.single('image'), adminController.addProduct);
router.put('/products/:productId', upload.single('image'), adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

/* ----------------------- Multer error handler (nice) -------------------- */
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    // size/type errors etc.
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image too large (max 5MB)' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Only JPG/PNG/WEBP/GIF images are allowed' });
    }
    return res.status(400).json({ error: `Upload error: ${err.code}` });
  }
  // pass other errors to the default handler upstream
  return res.status(500).json({ error: 'Server error' });
});

module.exports = router;
