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
      return;
    }

    cartItemsContainer.innerHTML = cartItems.map(item => {
      const imgSrc = buildImgSrc(item.image);
      const name = String(item.name || '');
      const desc = String(item.description || '');
      const price = Number(item.price);
      const formattedPrice = Number.isFinite(price) ? `$${price.toFixed(2)}` : `$${item.price}`;

      return `
        <div class="cart-item" data-id="${item.id}">
          <img src="${imgSrc}" alt="${name}" onerror="this.src='../imgs/placeholder.jpg'">
          <h3>${name}</h3>
          <p>${desc}</p>
          <p class="price">${formattedPrice}</p>
          <button class="remove-from-cart" data-id="${item.id}">Remove</button>
        </div>
      `;
    }).join('');

    // Attach event listeners to "Remove" buttons
    document.querySelectorAll('.remove-from-cart').forEach(button => {
      button.addEventListener('click', async function () {
        const productId = this.getAttribute('data-id');
        const confirmed = confirm('Are you sure you want to remove this item?');
        if (!confirmed) return;

        try {
          const deleteResponse = await fetch(API(`/api/cart/${productId}`), {
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
  } catch (error) {
    console.error('Error loading cart items:', error);
    cartItemsContainer.innerHTML = '<p>Failed to load cart items.</p>';
  }
});
