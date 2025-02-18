const { getProducts, addProduct } = require('../models/productModel');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await getProducts();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};

exports.addNewProduct = async (req, res) => {
    try {
        const { name, price, image, description } = req.body;
        await addProduct(name, price, image, description);
        res.status(201).json({ message: "Product added successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error adding product" });
    }
};
