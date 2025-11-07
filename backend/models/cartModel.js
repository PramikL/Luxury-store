const pool = require('./db');

// Get all cart items for a user (joined with products)
const getCartItems = async (userId) => {
    try {
        const [cartItems] = await pool.query(
            `
            SELECT 
                products.id,              -- product id
                products.name,
                products.price,
                products.image,
                products.description,
                products.category,        -- for recommendations
                cart.quantity             -- ⭐ how many of this product in cart
            FROM cart 
            JOIN products ON cart.product_id = products.id 
            WHERE cart.user_id = ?
            `,
            [userId]
        );

        return cartItems;
    } catch (error) {
        console.error("Error fetching cart items:", error);
        throw new Error("Failed to fetch cart items");
    }
};

// Add a product to the cart (increase quantity if it already exists)
const addProductToCart = async (userId, productId) => {
    try {
        // Check if product already exists in cart
        const [existingCart] = await pool.query(
            "SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );

        if (existingCart.length > 0) {
            // If it exists, just increment quantity
            await pool.query(
                "UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?",
                [userId, productId]
            );
            return { message: "Product quantity increased in cart" };
        }

        // Otherwise insert with quantity = 1
        await pool.query(
            "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)",
            [userId, productId]
        );

        return { message: "Product added to cart" };
    } catch (error) {
        console.error("Error adding product to cart:", error);
        throw new Error("Failed to add product to cart");
    }
};

// Remove a product completely from the cart
// (still deletes the row; we could later add a 'decrease quantity' endpoint)
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
