// ---------- Config ----------
const API_BASE = (window.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = (p) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

// ---------- Helpers ----------
function escapeHTML(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Build a correct image src regardless of what's stored in DB
function buildImgSrc(imageField) {
  if (!imageField) return '../imgs/placeholder.jpg';

  const img = String(imageField);
  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  // If controller saved '/uploads/filename.ext'
  if (img.startsWith('/')) return `${API_BASE}${img}`;

  // If DB has only the filename 'filename.ext'
  return `${API_BASE}/uploads/${img}`;
}

// ---------- Render ----------
function productCard(product) {
  const src = buildImgSrc(product.image);
  const name = escapeHTML(product.name);
  const desc = escapeHTML(product.description || '');
  const price = Number.isFinite(Number(product.price))
    ? currency.format(Number(product.price))
    : escapeHTML(product.price);

  return `
    <div class="product-card">
      <img src="${src}" alt="${name}" onerror="this.src='../imgs/placeholder.jpg'">
      <h3>${name}</h3>
      <p class="price">${price}</p>
      <p>${desc}</p>
      <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
    </div>
  `;
}

// ---------- Main ----------
document.addEventListener('DOMContentLoaded', async () => {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  try {
    const res = await fetch(API('/api/products'));
    if (!res.ok) throw new Error(`Failed to load products (HTTP ${res.status})`);
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      productList.innerHTML = `<p>No products available yet.</p>`;
      return;
    }

    productList.innerHTML = products.map(productCard).join('');

    // Add-to-cart handlers
    productList.querySelectorAll('.add-to-cart').forEach((btn) => {
      btn.addEventListener('click', async function () {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to add items to your cart.');
          window.location.href = 'login.html';
          return;
        }

        const productId = this.getAttribute('data-id');
        try {
          const r = await fetch(API('/api/cart'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ product_id: productId }),
          });

          // Handle unauthorized (expired token)
          if (r.status === 401) {
            localStorage.removeItem('token');
            alert('Session expired. Please log in again.');
            window.location.href = 'login.html';
            return;
          }

          const data = await r.json();
          if (!r.ok || data.error) {
            throw new Error(data.error || `Failed (HTTP ${r.status})`);
          }

          alert('Product added to cart!');
        } catch (err) {
          console.error('Add to cart error:', err);
          alert('Failed to add product to cart.');
        }
      });
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    productList.innerHTML = `<p>Failed to load products. Please try again later.</p>`;
  }
});
