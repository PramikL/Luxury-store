
document.addEventListener("DOMContentLoaded", async function () {
    const cartItemsContainer = document.getElementById("cart-items");
    const token = localStorage.getItem("token");

    if (!token) {
        alert("You need to log in to view your cart!");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/cart", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("Failed to fetch cart items");

        const cartItems = await response.json();

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
            return;
        }

        cartItemsContainer.innerHTML = cartItems.map(item => `
            <div class="cart-item" data-id="${item.id}">
              <img src="http://localhost:5000/${item.image}" alt="${item.name}">

                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p class="price">$${item.price}</p>
                <button class="remove-from-cart" data-id="${item.id}">Remove</button>
            </div>
        `).join("");

        // ⭐ Attach event listeners to "Remove" buttons
        document.querySelectorAll(".remove-from-cart").forEach(button => {
            button.addEventListener("click", async function () {
                const productId = this.getAttribute("data-id");

                const confirmed = confirm("Are you sure you want to remove this item?");
                if (!confirmed) return;

                try {
                    const deleteResponse = await fetch(`http://localhost:5000/api/cart/${productId}`, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const result = await deleteResponse.json();
                    console.log("Remove response:", result);

                    if (deleteResponse.ok) {
                        // Remove the item from the DOM
                        this.closest(".cart-item").remove();

                        // Optional: Show empty cart message if no items left
                        if (document.querySelectorAll(".cart-item").length === 0) {
                            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
                        }
                    } else {
                        alert("Failed to remove item.");
                    }
                } catch (err) {
                    console.error("Error removing item:", err);
                    alert("Error removing item.");
                }
            });
        });
     // ✅  checkout button logic here:
     const checkoutBtn = document.getElementById("checkout-btn");
     if (checkoutBtn) {
         checkoutBtn.addEventListener("click", () => {
             window.location.href = "checkout.html";
         });
     }
    } catch (error) {
        console.error("Error loading cart items:", error);
        cartItemsContainer.innerHTML = "<p>Failed to load cart items.</p>";
    }
});
