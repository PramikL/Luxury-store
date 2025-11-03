// backend/controllers/adminController.js
const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const ProductModel = require('../models/productModel');

// ---------------------------- helpers ----------------------------

function bad(res, msg = 'Bad request', code = 400) {
  return res.status(code).json({ error: msg });
}

function safeNumber(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num : NaN;
}

function fileToPublicPath(file) {
  // store public URL path used by frontend (served via app.use('/uploads', express.static(...)))
  return file ? `/uploads/${file.filename}` : null;
}

// ------------------------ Users (Admin) --------------------------

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return bad(res, 'Password must be at least 6 characters');
    }

    const user = await UserModel.getUserById(userId);
    if (!user) return bad(res, 'User not found', 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updateUserPassword(userId, hashed);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updateUserPassword error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // prevent self-delete
    if (req.user && String(req.user.id) === String(userId)) {
      return bad(res, "You can't delete your own account", 403);
    }

    const user = await UserModel.getUserById(userId);
    if (!user) return bad(res, 'User not found', 404);

    await UserModel.deleteUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return bad(res, "Invalid role. Must be 'user' or 'admin'");
    }

    const target = await UserModel.getUserById(userId);
    if (!target) return bad(res, 'User not found', 404);

    // prevent self role change that drops own admin rights
    if (req.user && String(req.user.id) === String(userId) && role !== 'admin') {
      return bad(res, "You can't remove your own admin role", 403);
    }

    // prevent demoting the last admin
    if (target.role === 'admin' && role === 'user') {
      const all = await UserModel.getAllUsers();
      const adminCount = all.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) return bad(res, 'Cannot demote the last admin', 409);
    }

    await UserModel.updateUserRole(userId, role);
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// ----------------------- Products (Admin) -----------------------

exports.getAllProducts = async (_req, res) => {
  try {
    const products = await ProductModel.getProducts();
    res.json(products);
  } catch (err) {
    console.error('getAllProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, price, description, category = 'general' } = req.body;
    if (!name) return bad(res, 'Product name is required');
    const priceNum = safeNumber(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return bad(res, 'Invalid price');

    const imagePath = fileToPublicPath(req.file); // '/uploads/xxx.ext' or null

    const result = await ProductModel.addProduct(
      name,
      priceNum,
      imagePath,
      description ?? null,
      category || 'general'
    );

    res.status(201).json({ message: 'Product added successfully', id: result.insertId });
  } catch (err) {
    console.error('addProduct error:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, price, description, category } = req.body;

    if (!name) return bad(res, 'Product name is required');
    const priceNum = safeNumber(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return bad(res, 'Invalid price');

    // IMPORTANT: undefined => keep current image, null => clear, string => replace
    const imagePath = req.file ? fileToPublicPath(req.file) : undefined;

    const result = await ProductModel.updateProduct(
      productId,
      name,
      priceNum,
      imagePath,
      description ?? null,
      category || 'general'
    );

    if (result.affectedRows === 0) return bad(res, 'Product not found', 404);
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await ProductModel.deleteProduct(productId);
    if (result.affectedRows === 0) return bad(res, 'Product not found', 404);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// ----------------------- Dashboard stats -----------------------

exports.getDashboardStats = async (_req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    const products = await ProductModel.getProducts();

    const stats = {
      totalUsers: users.length,
      totalProducts: products.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length,
    };

    res.json(stats);
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
