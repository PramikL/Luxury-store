// frontend/js/script.js

// ---------- API + helpers ----------
const API_BASE = (window.API_BASE || "http://localhost:5000").replace(/\/$/, "");
const API = (p) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

// Build a correct image src regardless of what's stored in DB
function buildImgSrc(imageField) {
  if (!imageField) return "../imgs/placeholder.jpg";

  const img = String(imageField);

  // Already a full URL
  if (img.startsWith("http://") || img.startsWith("https://")) return img;

  // Stored like "/uploads/xyz.jpg"
  if (img.startsWith("/")) return `${API_BASE}${img}`;

  // Stored as just "xyz.jpg"
  return `${API_BASE}/uploads/${img}`;
}

document.addEventListener("DOMContentLoaded", function () {
  /* -------------------- Navbar login / logout toggle -------------------- */
  // Works if your HTML has:
  // <li id="login-link"><a href="login.html">Login</a></li>
  // <li id="logout-link" style="display:none;"><a href="#" id="logout-btn">Logout</a></li>
  const token = localStorage.getItem("token");
  const loginLi = document.getElementById("login-link");
  const logoutLi = document.getElementById("logout-link");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginLi && logoutLi && logoutBtn) {
    if (token) {
      loginLi.style.display = "none";
      logoutLi.style.display = "inline-block";

      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.removeItem("token");
        alert("You have been logged out.");
        window.location.href = "login.html";
      });
    } else {
      loginLi.style.display = "inline-block";
      logoutLi.style.display = "none";
    }
  }

  /* ------------------------- Featured products -------------------------- */
  const productList = document.getElementById("product-list");
  if (!productList) return;

  fetch(API("/api/products"))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load products (HTTP ${response.status})`);
      }
      return response.json();
    })
    .then((products) => {
      // Show only the first three products
      const limitedProducts = Array.isArray(products) ? products.slice(0, 3) : [];

      if (!limitedProducts.length) {
        productList.innerHTML = "<p>No products available yet.</p>";
        return;
      }

      productList.innerHTML = limitedProducts
        .map((product) => {
          const imgSrc = buildImgSrc(product.image);
          const priceNum = Number(product.price);
          const price = Number.isFinite(priceNum)
            ? currency.format(priceNum)
            : `$${product.price}`;
          const name = product.name ?? "";

          return `
            <div class="product-card">
              <img src="${imgSrc}" alt="${name}" onerror="this.src='../imgs/placeholder.jpg'">
              <h3>${name}</h3>
              <p>${price}</p>
              <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
            </div>
          `;
        })
        .join("");

      // Attach Add-to-cart handlers
      productList.querySelectorAll(".add-to-cart").forEach((button) => {
        button.addEventListener("click", async function () {
          const token = localStorage.getItem("token");

          if (!token) {
            alert("⚠️ Please log in to add items to your cart.");
            window.location.href = "login.html";
            return;
          }

          const productId = this.getAttribute("data-id");

          try {
            const res = await fetch(API("/api/cart"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ product_id: productId }),
            });

            if (res.status === 401) {
              alert("⚠️ Your session has expired. Please log in again.");
              localStorage.removeItem("token");
              window.location.href = "login.html";
              return;
            }

            const data = await res.json();

            if (!res.ok || data.error) {
              throw new Error(data.error || `Failed (HTTP ${res.status})`);
            }

            console.log("Add to cart response:", data);
            alert("🛒 Product added to cart!");
          } catch (error) {
            console.error("Error adding to cart:", error);
            alert("❌ Failed to add product to cart.");
          }
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching products:", error);
      productList.innerHTML = "<p>Failed to load products.</p>";
    });
});
