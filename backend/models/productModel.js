const pool = require('./db');

const getProducts = async () => {
    const [products] = await pool.query("SELECT * FROM products");
    return products;
};

const addProduct = async (name, price, image, description) => {
    const sql = "INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)";
    const [result] = await pool.query(sql, [name, price, image, description]);
    return result;
};

module.exports = { getProducts, addProduct };
