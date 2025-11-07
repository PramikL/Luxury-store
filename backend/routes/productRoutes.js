// backend/routes/productRoutes.js
const express = require('express');
const {
  getAllProducts,
  addNewProduct,
  getRecommendedProducts,
  getProductByIdHandler,
} = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// GET /api/products  -> list products (optional ?category=... handled in controller)
router.get('/', getAllProducts);

// POST /api/products -> create a product via JSON body (no file upload here)
router.post('/', addNewProduct);

// POST /api/products/upload-image -> upload product image (for any frontend that needs it)
// Returns a relative path like "/uploads/filename.jpg"
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // Store just the relative path; frontend will prepend API_BASE
  const imagePath = `/uploads/${req.file.filename}`;
  res.status(200).json({ imagePath });
});

// GET /api/products/:productId/recommendations -> category-based recommendations
router.get('/:productId/recommendations', getRecommendedProducts);

// GET /api/products/:productId -> single product details
router.get('/:productId', getProductByIdHandler);

module.exports = router;
