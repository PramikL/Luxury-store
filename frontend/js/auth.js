// ================== Config & Helpers ==================
const API_BASE = (window.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = (p) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = !!isLoading;
  btn.dataset.originalText ??= btn.textContent;
  btn.textContent = isLoading ? 'Please wait…' : btn.dataset.originalText;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* ignore parse error */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data || {};
}

function redirectAfterLogin(data) {
  // Priority 1: URL param ?next=admin
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  // Priority 2 (optional): if backend returns role, route admins to admin panel
  const role = data?.user?.role;

  if (next === 'admin') {
    window.location.href = 'admin.html';
  } else if (role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'index.html';
  }
}

// ================== Init ==================
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // ---- Login ----
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailEl = document.getElementById('email');
      const passEl = document.getElementById('password');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      const email = String(emailEl.value || '').trim().toLowerCase();
      const password = String(passEl.value || '').trim();

      if (!email || !password) {
        alert('Please enter email and password.');
        return;
      }

      try {
        setLoading(submitBtn, true);
        const data = await postJSON(API('/api/auth/login'), { email, password });

        // Expecting { token, user? } — store JWT always
        if (!data.token) throw new Error('Missing token in response');

        localStorage.setItem('token', data.token);
        alert('Login successful!');
        redirectAfterLogin(data);

      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---- Register ----
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userEl = document.getElementById('username');
      const emailEl = document.getElementById('email');
      const passEl = document.getElementById('password');
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      const username = String(userEl.value || '').trim();
      const email = String(emailEl.value || '').trim().toLowerCase();
      const password = String(passEl.value || '').trim();

      if (!username || !email || !password) {
        alert('Please fill all fields.');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }

      try {
        setLoading(submitBtn, true);
        const data = await postJSON(API('/api/auth/register'), { username, email, password });
        // If your backend returns { message }, great — otherwise just redirect.
        alert(data.message || 'Registration successful!');
        window.location.href = 'login.html';
      } catch (err) {
        console.error('Register error:', err);
        alert('Registration failed: ' + err.message);
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }
});
