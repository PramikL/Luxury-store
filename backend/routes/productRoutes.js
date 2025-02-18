const express = require('express');
const { getAllProducts, addNewProduct } = require('../controllers/productController');
const router = express.Router();

router.get('/', getAllProducts);
router.post('/', addNewProduct);

module.exports = router;
