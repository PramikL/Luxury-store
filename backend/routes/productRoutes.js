const express = require('express');
const { getAllProducts, addNewProduct } = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware'); // Add this line

const router = express.Router();

// Get all products
router.get('/', getAllProducts);

// Add a new product (you’ll pass the image URL here)
router.post('/', addNewProduct);

// Upload product image
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = `http://localhost:5000/uploads/${req.file.filename}`;
    res.status(200).json({ imagePath });
});

module.exports = router;