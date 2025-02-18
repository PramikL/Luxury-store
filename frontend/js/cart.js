document.addEventListener("DOMContentLoaded", async function () {
    const cartItemsContainer = document.getElementById("cart-items");
    const token = localStorage.getItem("token");

    if (!token) {
        alert("You need to log in to view your cart!");
        window.location.href = "login.html";
        return;
    }

    try {
        console.log("Fetching cart items...");
        console.log("Token Sent:", token); // ✅ Debugging Log

        // Debugging fetch request
        fetch("http://localhost:5000/api/cart", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => console.log("Cart API Response in Browser:", data))
        .catch(err => console.error("Fetch Error:", err));

        const response = await fetch("http://localhost:5000/api/cart", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch cart items");
        }

        const cartItems = await response.json();
        console.log("Parsed Cart Items:", cartItems); // ✅ Debugging Log

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
            return;
        }

        cartItemsContainer.innerHTML = cartItems.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p class="price">$${item.price}</p>
                <button class="remove-from-cart" data-id="${item.id}">Remove</button>
            </div>
        `).join("");

    } catch (error) {
        console.error("Error loading cart items:", error);
        cartItemsContainer.innerHTML = "<p>Failed to load cart items.</p>";
    }
});
