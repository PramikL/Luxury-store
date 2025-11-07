// backend/controllers/productController.js
const {
  getProducts,
  addProduct,
  getProductsByCategory,
  getRelatedProductsByCategory,
  getProductById,
} = require('../models/productModel');

/**
 * GET /api/products
 * Optional query: ?category=bags or ?category=shoes
 * - If category is provided (and not 'all'), filter by that category.
 * - Otherwise, return all products (newest first).
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let products;
    if (category && category !== 'all') {
      products = await getProductsByCategory(category);
    } else {
      products = await getProducts();
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * POST /api/products
 * Basic product creation (not using file upload here).
 * Body: { name, price, image, description, category? }
 *
 * NOTE:
 * - In your project, the admin panel uses its own routes (with multer) to
 *   create products. This endpoint is more of a generic API fallback.
 */
exports.addNewProduct = async (req, res) => {
  try {
    const { name, price, image, description, category = 'general' } = req.body;

    await addProduct(name, price, image, description, category);

    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Error adding product' });
  }
};

/**
 * GET /api/products/:productId
 * Fetch a single product by id.
 */
exports.getProductByIdHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const id = Number(productId);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Error fetching product by id:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

/**
 * GET /api/products/:productId/recommendations
 * Category-based recommendation:
 * - Finds the product's category.
 * - Returns up to 4 other products from the same category (excluding itself).
 * - If none are found, falls back to "latest products" excluding this product.
 */
exports.getRecommendedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const id = Number(productId);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    // 1) Get category-based related products
    let recommendations = await getRelatedProductsByCategory(id, 4);

    // 2) Fallback: if none found, return some other products
    if (!recommendations || recommendations.length === 0) {
      const all = await getProducts();
      recommendations = all.filter((p) => p.id !== id).slice(0, 4);
    }

    res.json(recommendations);
  } catch (err) {
    console.error('Error getting recommended products:', err);
    res.status(500).json({ error: 'Failed to get recommended products' });
  }
};
