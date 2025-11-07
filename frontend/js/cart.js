// frontend/js/cart.js

// ---------- Config ----------
const API_BASE = (window.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = (p) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

// Build a correct image src regardless of what's stored in DB
function buildImgSrc(imageField) {
  if (!imageField) return '../imgs/placeholder.jpg';

  const img = String(imageField);

  // Already a full URL
  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  // Stored like "/uploads/xyz.jpg"
  if (img.startsWith('/')) return `${API_BASE}${img}`;

  // Stored as just "xyz.jpg"
  return `${API_BASE}/uploads/${img}`;
}

document.addEventListener('DOMContentLoaded', async function () {
  const cartItemsContainer = document.getElementById('cart-items');
  const token = localStorage.getItem('token');

  if (!cartItemsContainer) return;

  if (!token) {
    alert('You need to log in to view your cart!');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(API('/api/cart'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem('token');
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) throw new Error(`Failed to fetch cart items (HTTP ${response.status})`);

    const cartItems = await response.json();

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
      const recContainer = document.getElementById('recommendations');
      if (recContainer) recContainer.innerHTML = '';
      return;
    }

   
    cartItemsContainer.innerHTML = cartItems.map(item => {
  const imgSrc = buildImgSrc(item.image);
  const name = String(item.name || '');
  const desc = String(item.description || '');
  const unitPrice = Number(item.price);
  const qty = Number(item.quantity || 1);
  const total = unitPrice * qty;

  const formattedUnit = Number.isFinite(unitPrice) ? `$${unitPrice.toFixed(2)}` : `$${item.price}`;
  const formattedTotal = Number.isFinite(total) ? `$${total.toFixed(2)}` : formattedUnit;

  return `
    <div class="cart-item" data-id="${item.id}">
      <img src="${imgSrc}" alt="${name}" onerror="this.src='../imgs/placeholder.jpg'">
      <h3>${name}</h3>
      <p>${desc}</p>
      <p>Quantity: <strong>${qty}</strong></p>
      <p class="price">Unit price: ${formattedUnit}</p>
      <p class="price">Total: ${formattedTotal}</p>
      <button class="remove-from-cart" data-id="${item.id}">Remove</button>
    </div>
  `;
}).join('');


    // Attach event listeners to "Remove" buttons
    document.querySelectorAll('.remove-from-cart').forEach(button => {
      button.addEventListener('click', async function () {
        const cartRowId = this.getAttribute('data-id'); // cart table id
        const confirmed = confirm('Are you sure you want to remove this item?');
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(API(`/api/cart/${cartRowId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          // Handle unauthorized
          if (deleteResponse.status === 401) {
            localStorage.removeItem('token');
            alert('Session expired. Please log in again.');
            window.location.href = 'login.html';
            return;
          }

          const result = await deleteResponse.json();
          console.log('Remove response:', result);

          if (deleteResponse.ok) {
            // Remove the item from the DOM
            this.closest('.cart-item').remove();

            // Show empty cart message if no items left
            if (!document.querySelector('.cart-item')) {
              cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
              const recContainer = document.getElementById('recommendations');
              if (recContainer) recContainer.innerHTML = '';
            }
          } else {
            alert(result.error || 'Failed to remove item.');
          }
        } catch (err) {
          console.error('Error removing item:', err);
          alert('Error removing item.');
        }
      });
    });

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        window.location.href = 'checkout.html';
      });
    }

    // ⭐ Load recommendations based on cart categories
    await loadRecommendationsFromCart(cartItems);

  } catch (error) {
    console.error('Error loading cart items:', error);
    cartItemsContainer.innerHTML = '<p>Failed to load cart items.</p>';
  }
});

// ---------- Recommendations based on category ----------
async function loadRecommendationsFromCart(cartItems) {
  const recContainer = document.getElementById('recommendations');
  if (!recContainer) return;

  // Determine best category to recommend
  let category = 'general';

  // Prefer a specific category over 'general'
  const withCategory = cartItems.filter(
    (i) => i.category && String(i.category).trim() !== ''
  );

  const preferred =
    withCategory.find(
      (i) => i.category && i.category.toLowerCase() !== 'general'
    ) || withCategory[0];

  if (preferred && preferred.category) {
    category = String(preferred.category).trim();
  }

  // Keep track of names already in the cart to avoid recommending them again
  const cartNames = new Set(
    cartItems.map((i) => String(i.name || '').toLowerCase())
  );

  try {
    // Fetch products for that category
    const url =
      category && category !== 'all'
        ? API(`/api/products?category=${encodeURIComponent(category)}`)
        : API('/api/products');

    const res = await fetch(url);
    if (!res.ok) {
      console.error('Failed to fetch recommendations list:', res.status);
      return;
    }

    let products = await res.json();
    if (!Array.isArray(products)) products = [];

    // Filter out items already in the cart (by name)
    products = products.filter((p) => {
      const nm = String(p.name || '').toLowerCase();
      return !cartNames.has(nm);
    });

    // Limit to 4 recommendations
    products = products.slice(0, 4);

    if (products.length === 0) {
      recContainer.innerHTML =
        '<p style="color: white; text-align: center;">No recommendations available.</p>';
      return;
    }

    recContainer.innerHTML = products
      .map((p) => {
        const imgSrc = buildImgSrc(p.image);
        const name = String(p.name || '');
        const price = Number(p.price);
        const formattedPrice = Number.isFinite(price)
          ? `$${price.toFixed(2)}`
          : `$${p.price}`;

        return `
          <div class="product-card">
            <img src="${imgSrc}" alt="${name}" onerror="this.src='../imgs/placeholder.jpg'">
            <h3>${name}</h3>
            <p class="price">${formattedPrice}</p>
            <button class="add-rec-to-cart" data-product-id="${p.id}">Add to Cart</button>
          </div>
        `;
      })
      .join('');

    // Attach add-to-cart handlers for recommended products
    recContainer.querySelectorAll('.add-rec-to-cart').forEach((btn) => {
      btn.addEventListener('click', async function () {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to add items to your cart.');
          window.location.href = 'login.html';
          return;
        }

        const productId = this.getAttribute('data-product-id');

        try {
          const r = await fetch(API('/api/cart'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ product_id: productId }),
          });

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
          console.error('Error adding recommended item to cart:', err);
          alert('Failed to add product to cart.');
        }
      });
    });
  } catch (err) {
    console.error('Error loading recommendations:', err);
  }
}
