// backend/models/productModel.js
const pool = require('./db');

/**
 * Helper to normalize/validate inputs coming from controllers.
 * Keeps your model layer resilient.
 */
function normalizeProductInput({ name, price, image, description, category }) {
  const trimmedName = String(name ?? '').trim();
  const trimmedDesc = description == null ? null : String(description).trim();
  const trimmedCat = String(category ?? 'general').trim() || 'general';

  // Coerce price to a number with two decimals (but don't round in SQL)
  const numPrice = Number(price);
  if (!trimmedName) throw new Error('Product name is required');
  if (!Number.isFinite(numPrice) || numPrice < 0) throw new Error('Invalid price');

  // Allow empty image (null) for update flows
  const img = image ? String(image).trim() : null;

  return {
    name: trimmedName,
    price: numPrice,
    image: img,
    description: trimmedDesc,
    category: trimmedCat,
  };
}

/**
 * Get all products (newest first).
 * Designed for both storefront and admin panel list.
 */
const getProducts = async () => {
  const sql = `
    SELECT id, name, price, image, description, category, created_at
    FROM products
    ORDER BY created_at DESC, id DESC
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * Retrieve one product by id.
 */
const getProductById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, name, price, image, description, category, created_at
     FROM products
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Create a product.
 * @param {string} name
 * @param {number|string} price
 * @param {string|null} image    e.g. '/uploads/xxx.jpg' or null
 * @param {string|null} description
 * @param {string} category      default 'general'
 * @returns {object} insert result
 */
const addProduct = async (name, price, image, description, category = 'general') => {
  const input = normalizeProductInput({ name, price, image, description, category });

  const sql = `
    INSERT INTO products (name, price, image, description, category)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [input.name, input.price, input.image, input.description, input.category];
  const [result] = await pool.query(sql, params);
  return result; // includes insertId
};

/**
 * Update a product.
 * If image is falsy (undefined/null/''), the existing image will be kept.
 * Pass a real value (string path) to replace it; pass explicit null to clear it.
 */
const updateProduct = async (id, name, price, image, description, category) => {
  // Note: We want to distinguish between "do not change image" and "set image=null".
  // Callers should pass undefined to keep, null to clear, string to replace.
  const provided = { name, price, image, description, category };
  const { name: nm, price: pr, description: desc, category: cat } =
    normalizeProductInput(provided);

  let sql;
  let params;

  if (image !== undefined) {
    // Replace (string) or clear (null)
    const img = image ? String(image).trim() : null;
    sql = `
      UPDATE products
      SET name = ?, price = ?, image = ?, description = ?, category = ?
      WHERE id = ?
    `;
    params = [nm, pr, img, desc, cat, id];
  } else {
    // Keep existing image value
    sql = `
      UPDATE products
      SET name = ?, price = ?, description = ?, category = ?
      WHERE id = ?
    `;
    params = [nm, pr, desc, cat, id];
  }

  const [result] = await pool.query(sql, params);
  return result; // affectedRows, etc.
};

/**
 * Delete a product by id.
 */
const deleteProduct = async (id) => {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result;
};

/**
 * List products by category (newest first).
 */
const getProductsByCategory = async (category) => {
  const cat = String(category ?? 'general').trim() || 'general';
  const [rows] = await pool.query(
    `SELECT id, name, price, image, description, category, created_at
     FROM products
     WHERE category = ?
     ORDER BY created_at DESC, id DESC`,
    [cat]
  );
  return rows;
};

/**
 * (Optional) Count products – handy for admin pagination.
 */
const countProducts = async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM products`);
  return rows[0]?.total ?? 0;
};

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  // optional utility
  countProducts,
};
