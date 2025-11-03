// ===================== CONFIG & HELPERS =====================
const API_BASE = (window.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = (p) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

function handle401(res) {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return true;
  }
  return false;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (handle401(res)) return Promise.reject(new Error('Unauthorized'));
  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function showToast(message, isError = false) {
  let cont = document.getElementById('toast');
  if (!cont) return alert(message); // fallback if no toast container
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'toast--error' : ''}`;
  el.textContent = message;
  cont.appendChild(el);
  setTimeout(() => cont.removeChild(el), 2500);
}

const fmtCurrency = (n) => {
  const val = Number(n);
  if (!Number.isFinite(val)) return n;
  return `₹${val.toFixed(2)}`; // tweak as you like
};
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

// cache so we can prefill edit
let __products = [];
let __users = [];

// ===================== BOOTSTRAP =====================
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  initAdminPanel();
});

// ===================== PANEL INIT =====================
function initAdminPanel() {
  // Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      tabContents.forEach(t => t.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');

      loadTabContent(targetTab);
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });

  // Modals
  setupModals();

  // Initial
  loadTabContent('dashboard');
}

// ===================== TABS LOADING =====================
function loadTabContent(tabName) {
  switch (tabName) {
    case 'dashboard': loadDashboard(); break;
    case 'users': loadUsers(); break;
    case 'products': loadProducts(); break;
  }
}

async function loadDashboard() {
  try {
    const stats = await fetchJSON(API('/api/admin/dashboard'), { headers: authHeader() });
    document.getElementById('total-users').textContent = stats.totalUsers;
    document.getElementById('total-products').textContent = stats.totalProducts;
    document.getElementById('admin-users').textContent = stats.adminUsers;
    document.getElementById('regular-users').textContent = stats.regularUsers;
  } catch (err) {
    console.error('Dashboard:', err);
    showToast(err.message || 'Failed to load dashboard', true);
  }
}

async function loadUsers() {
  try {
    __users = await fetchJSON(API('/api/admin/users'), { headers: authHeader() });
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = __users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${escapeHTML(user.username)}</td>
        <td>${escapeHTML(user.email)}</td>
        <td>
          <select class="role-select" data-user-id="${user.id}" ${user.role === 'admin' ? 'disabled' : ''}>
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td>${user.created_at ? fmtDate(user.created_at) : '-'}</td>
        <td>
          <button class="table-action" onclick="changeUserPassword(${user.id})">
            <i class="fas fa-key"></i> Password
          </button>
          ${user.role !== 'admin' ? `
            <button class="table-action table-action--danger" onclick="deleteUser(${user.id})">
              <i class="fas fa-trash"></i> Delete
            </button>` : ''}
        </td>
      </tr>
    `).join('');

    // Role changes
    document.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.userId;
        const role = e.target.value;
        updateUserRole(id, role);
      });
    });

  } catch (err) {
    console.error('Users:', err);
    showToast(err.message || 'Failed to load users', true);
  }
}

async function loadProducts() {
  try {
    __products = await fetchJSON(API('/api/admin/products'), { headers: authHeader() });
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = __products.map(product => {
      const imgSrc = product.image ? `${API_BASE}${product.image.startsWith('/') ? '' : '/'}${product.image}` : '../imgs/placeholder.jpg';
      return `
        <tr>
          <td>${product.id}</td>
          <td>
            <img src="${imgSrc}" alt="${escapeHTML(product.name)}"
                 onerror="this.src='../imgs/placeholder.jpg'">
          </td>
          <td>${escapeHTML(product.name)}</td>
          <td>${fmtCurrency(product.price)}</td>
          <td>${escapeHTML(product.category || 'General')}</td>
          <td>
            <button class="table-action" onclick="editProduct(${product.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="table-action table-action--danger" onclick="deleteProduct(${product.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Products:', err);
    showToast(err.message || 'Failed to load products', true);
  }
}

// ===================== MODALS =====================
function setupModals() {
  const productModal = document.getElementById('product-modal');
  const userModal = document.getElementById('user-modal');
  const addBtn = document.getElementById('add-product-btn');
  const closeBtns = document.querySelectorAll('.close');
  const cancelBtns = document.querySelectorAll('.cancel-btn');

  // Open add product
  addBtn?.addEventListener('click', () => {
    setProductFormMode('create');
    resetProductForm();
    openModal(productModal);
  });

  // Close buttons
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    closeModal(productModal); closeModal(userModal);
  }));
  cancelBtns.forEach(btn => btn.addEventListener('click', () => {
    closeModal(productModal); closeModal(userModal);
  }));

  // Outside click
  window.addEventListener('click', (e) => {
    if (e.target === productModal) closeModal(productModal);
    if (e.target === userModal) closeModal(userModal);
  });

  // Submit
  document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
}

function openModal(m) { if (m) m.classList.add('open'); }
function closeModal(m) { if (m) m.classList.remove('open'); }

// ===================== PRODUCT FORM HANDLERS =====================
function setProductFormMode(mode, product = null) {
  const title = document.getElementById('modal-title');
  const form = document.getElementById('product-form');
  form.dataset.mode = mode; // 'create' | 'edit'
  if (mode === 'edit' && product) {
    form.dataset.editId = String(product.id);
    title.textContent = 'Edit Product';
  } else {
    delete form.dataset.editId;
    title.textContent = 'Add New Product';
  }
}

function resetProductForm() {
  const form = document.getElementById('product-form');
  form.reset();
  const prev = document.getElementById('product-image-preview');
  if (prev) prev.innerHTML = '';
}

function fillProductForm(product) {
  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-price').value = product.price || '';
  document.getElementById('product-category').value = product.category || 'general';
  document.getElementById('product-description').value = product.description || '';
  // Preview current image (non-editable, just a hint)
  const prev = document.getElementById('product-image-preview');
  if (prev) {
    prev.innerHTML = '';
    if (product.image) {
      const img = document.createElement('img');
      img.src = `${API_BASE}${product.image.startsWith('/') ? '' : '/'}${product.image}`;
      img.alt = 'Current product image';
      prev.appendChild(img);
    }
  }
}

window.editProduct = function (productId) {
  const product = __products.find(p => String(p.id) === String(productId));
  if (!product) { showToast('Product not found in list', true); return; }
  setProductFormMode('edit', product);
  fillProductForm(product);
  openModal(document.getElementById('product-modal'));
};

async function handleProductSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const mode = form.dataset.mode || 'create';
  const editId = form.dataset.editId;

  const fd = new FormData(form);

  // If editing and no file chosen, do NOT append empty 'image' => keeps old image
  const fileInput = document.getElementById('product-image');
  if (!fileInput?.files?.length) {
    fd.delete('image'); // critical to trigger "keep image" semantics (image === undefined)
  }

  try {
    if (mode === 'edit' && editId) {
      await fetchJSON(API(`/api/admin/products/${editId}`), {
        method: 'PUT',
        headers: authHeader(), // do NOT set Content-Type; browser sets multipart boundary
        body: fd
      });
      showToast('Product updated!');
    } else {
      await fetchJSON(API('/api/admin/products'), {
        method: 'POST',
        headers: authHeader(),
        body: fd
      });
      showToast('Product added!');
    }

    closeModal(document.getElementById('product-modal'));
    resetProductForm();
    await loadProducts();
    await loadDashboard();
  } catch (err) {
    console.error('Product submit:', err);
    showToast(err.message || 'Failed to save product', true);
  }
}

// ===================== USER ACTIONS =====================
async function updateUserRole(userId, role) {
  try {
    await fetchJSON(API(`/api/admin/users/${userId}/role`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ role })
    });
    showToast('User role updated!');
    await loadUsers();
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to update role', true);
    // reload to revert invalid selection
    await loadUsers();
  }
}

window.changeUserPassword = async function (userId) {
  const newPassword = prompt('Enter new password for this user (min 6 chars):');
  if (!newPassword) return;
  if (String(newPassword).length < 6) {
    showToast('Password too short', true);
    return;
  }
  try {
    await fetchJSON(API(`/api/admin/users/${userId}/password`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ newPassword })
    });
    showToast('Password updated!');
  } catch (err) {
    showToast(err.message || 'Failed to update password', true);
  }
};

window.deleteUser = async function (userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    await fetchJSON(API(`/api/admin/users/${userId}`), {
      method: 'DELETE',
      headers: authHeader()
    });
    showToast('User deleted!');
    await loadUsers();
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to delete user', true);
  }
};

window.deleteProduct = async function (productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    await fetchJSON(API(`/api/admin/products/${productId}`), {
      method: 'DELETE',
      headers: authHeader()
    });
    showToast('Product deleted!');
    await loadProducts();
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to delete product', true);
  }
};

// ===================== UTILS =====================
function escapeHTML(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
