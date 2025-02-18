const pool = require('./db');

const getCartItems = async (userId) => {
    try {
        const [cartItems] = await pool.query(`
            SELECT products.id, products.name, products.price, products.image, products.description 
            FROM cart 
            JOIN products ON cart.product_id = products.id 
            WHERE cart.user_id = ?`, 
            [userId]
        );
        return cartItems;
    } catch (error) {
        console.error("Error fetching cart items:", error);
        throw new Error("Failed to fetch cart items");
    }
};

const addProductToCart = async (userId, productId) => {
    try {
        // Check if product already exists in cart to prevent duplicates
        const [existingCart] = await pool.query(
            "SELECT * FROM cart WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );

        if (existingCart.length > 0) {
            return { message: "Product is already in cart" };
        }

        await pool.query(
            "INSERT INTO cart (user_id, product_id) VALUES (?, ?)", 
            [userId, productId]
        );

        return { message: "Product added to cart" };
    } catch (error) {
        console.error("Error adding product to cart:", error);
        throw new Error("Failed to add product to cart");
    }
};

const removeCartItem = async (userId, productId) => {
    try {
        const [result] = await pool.query(
            "DELETE FROM cart WHERE user_id = ? AND product_id = ?", 
            [userId, productId]
        );

        if (result.affectedRows === 0) {
            return { message: "Product not found in cart" };
        }

        return { message: "Item removed from cart" };
    } catch (error) {
        console.error("Error removing item from cart:", error);
        throw new Error("Failed to remove item from cart");
    }
};

module.exports = { getCartItems, addProductToCart, removeCartItem };
