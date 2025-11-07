// frontend/js/nav-auth.js
// Handles showing Login vs Logout in the navbar on any page.

document.addEventListener('DOMContentLoaded', () => {
  const loginLi  = document.getElementById('login-link');
  const logoutLi = document.getElementById('logout-link');
  const logoutBtn = document.getElementById('logout-btn');

  const hasToken = !!localStorage.getItem('token');

  // Toggle visibility based on whether the user is logged in
  if (hasToken) {
    if (loginLi)  loginLi.style.display  = 'none';
    if (logoutLi) logoutLi.style.display = 'inline-block';
  } else {
    if (loginLi)  loginLi.style.display  = 'inline-block';
    if (logoutLi) logoutLi.style.display = 'none';
  }

  // Logout behaviour
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      alert('You have been logged out.');
      // Send user to login page (or index.html if you prefer)
      window.location.href = 'login.html';
    });
  }
});
