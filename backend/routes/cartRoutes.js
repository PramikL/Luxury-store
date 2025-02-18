const express = require('express');
const { addToCart, fetchCartItems, deleteCartItem } = require('../controllers/cartController');
const authenticateUser = require('../middleware/authMiddleware');
const router = express.Router();

// Fetch user's cart items
router.get("/", authenticateUser, fetchCartItems);

// Add product to cart (POST)
router.post("/", authenticateUser, addToCart);

// Remove product from cart (DELETE)
router.delete("/:productId", authenticateUser, deleteCartItem);

module.exports = router;
