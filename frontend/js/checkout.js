// frontend/js/checkout.js

// ---------- Config ----------
const API_BASE = (window.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = (p) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

// Your Stripe publishable key (safe on frontend, test mode)
const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51RLihT06fYGoo1hnXCDBaCky0TOUapc4m2fsT5xIRvWSkstpiDkE2hnJgCQuYnyEIZhHfB0Jvv9JJMbRRz4OEi1X00Shtm04iW';

let stripe;
let cardElement;
let cartTotal = 0; // in dollars

// ---------- Helpers ----------
function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = !!isLoading;
  btn.dataset.originalText ??= btn.textContent;
  btn.textContent = isLoading ? 'Processing...' : btn.dataset.originalText;
}

function showCardError(message) {
  const errorEl = document.getElementById('card-errors');
  if (!errorEl) return;
  errorEl.textContent = message || '';
}

function formatMoney(amount) {
  return amount.toFixed(2);
}

// Load cart total from backend
async function loadCartTotal() {
  const token = localStorage.getItem('token');
  const totalEl = document.getElementById('order-total');

  if (!totalEl) return;

  if (!token) {
    alert('You need to log in before checking out.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(API('/api/cart'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) {
      console.error('Failed to fetch cart for total:', res.status);
      totalEl.textContent = '0.00';
      cartTotal = 0;
      return;
    }

    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      cartTotal = 0;
      totalEl.textContent = '0.00';
      return;
    }

    cartTotal = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity || 1);
      return sum + price * qty;
    }, 0);

    totalEl.textContent = formatMoney(cartTotal);
  } catch (err) {
    console.error('Error loading cart total:', err);
    cartTotal = 0;
    totalEl.textContent = '0.00';
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  // Init Stripe Elements
  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  const elements = stripe.elements();

  // 👇 Add this style config
  const style = {
    base: {
      color: '#ffffff',           // card number & text WHITE
      fontSize: '16px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      '::placeholder': {
        color: '#f0f0f0',         // placeholder light grey / whiteish
      },
      iconColor: '#ffffff',       // brand icons white
    },
    invalid: {
      color: '#ff6b6b',           // red for invalid fields
      iconColor: '#ff6b6b',
    },
  };

  // 👇 Pass style into the card element
  cardElement = elements.create('card', {
    hidePostalCode: true,
    style: style,
  });

  cardElement.mount('#card-element');


  cardElement.on('change', (event) => {
    if (event.error) {
      showCardError(event.error.message);
    } else {
      showCardError('');
    }
  });

  // Load cart total
  loadCartTotal();

  form.addEventListener('submit', handleCheckout);
});

// ---------- Main checkout flow ----------
async function handleCheckout(e) {
  e.preventDefault();

  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const methodEl = document.getElementById('method');
  const payButton = document.getElementById('pay-button');
  const token = localStorage.getItem('token');

  const name = nameEl?.value.trim() || '';
  const email = emailEl?.value.trim() || '';
  const method = methodEl?.value || '';

  if (!token) {
    alert('You need to log in before checking out.');
    window.location.href = 'login.html';
    return;
  }

  if (!name || !email || !method) {
    alert('Please fill out all fields.');
    return;
  }

  if (method !== 'credit') {
    alert('Currently only Credit / Debit Card via Stripe is supported.');
    return;
  }

  if (!cartTotal || cartTotal <= 0) {
    alert('Your cart is empty or total is invalid.');
    return;
  }

  // 👇 Ask user to confirm the total before charging
  const confirmed = confirm(`You will be charged $${formatMoney(cartTotal)}. Do you want to continue?`);
  if (!confirmed) {
    return;
  }

  try {
    setLoading(payButton, true);
    showCardError('');

    // 1. Ask backend to create a PaymentIntent for the cart total
    const res = await fetch(API('/api/payment/stripe/create'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: cartTotal,  // dollars; backend multiplies by 100
        currency: 'usd',
        customer: { name, email },
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      // ignore parse errors
    }

    if (!res.ok || !data.clientSecret) {
      console.error('Stripe create error:', data);
      alert(data.error || 'Failed to initiate payment.');
      return;
    }

    const clientSecret = data.clientSecret;

    // 2. Confirm the card payment with Stripe.js
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name,
          email,
        },
      },
    });

    if (result.error) {
      console.error('Stripe confirm error:', result.error);
      showCardError(result.error.message || 'Payment failed. Please try again.');
      return;
    }

    if (!result.paymentIntent || result.paymentIntent.status !== 'succeeded') {
      console.error('Unexpected payment intent status:', result.paymentIntent);
      alert('Payment did not complete. Please try again.');
      return;
    }

    // 3. (Optional) Clear cart on success
    try {
      await fetch(API('/api/cart'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (clearErr) {
      console.warn('Cart clear failed (continuing anyway):', clearErr);
    }

    // 4. Redirect to success page
    alert('Payment successful! Redirecting to success page.');
    window.location.href = 'success.html';
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Something went wrong during payment. Please try again.');
  } finally {
    setLoading(payButton, false);
  }
}
