const { getCartItems, addProductToCart, removeCartItem } = require('../models/cartModel');
const db = require('../models/db'); // Assuming this is where your DB connection is

const fetchCartItems = async (req, res) => {
    console.log("Fetching cart for user ID:", req.user.id); 
    const userId = req.user.id;
    try {
        const cartItems = await getCartItems(userId);
        console.log("Cart Items Found in DB:", cartItems);
        res.json(cartItems);
    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).json({ error: error.message });
    }
};

const addToCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: "Product ID is required" });
    }

    try {
        await addProductToCart(userId, product_id);
        res.status(201).json({ message: "Product added to cart" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCartItem = async (req, res) => {
    const userId = req.user.id;
    const productId = req.params.productId;
    try {
        const result = await removeCartItem(userId, productId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const clearCart = async (req, res) => {
    const userId = req.user.id;

    try {
        await db.query("DELETE FROM cart WHERE user_Id = ?", [userId]);
        
        res.status(200).json({ message: 'Cart cleared successfully.' });
    } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ error: 'Failed to clear cart.' });
    }
};

module.exports = { addToCart, fetchCartItems, deleteCartItem, clearCart };
