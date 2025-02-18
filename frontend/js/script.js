document.addEventListener("DOMContentLoaded", function () {
    const productList = document.getElementById("product-list");

    fetch("http://localhost:5000/api/products")
        .then(response => response.json())
        .then(products => {
            productList.innerHTML = products.map(product => `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>$${product.price}</p>
                    <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            `).join("");

            document.querySelectorAll(".add-to-cart").forEach(button => {
                button.addEventListener("click", function () {
                    let cart = JSON.parse(localStorage.getItem("cart")) || [];
                    let productId = this.getAttribute("data-id");
                    cart.push(productId);
                    localStorage.setItem("cart", JSON.stringify(cart));
                    alert("Added to cart!");
                });
            });
        })
        .catch(error => console.error("Error fetching products:", error));
});
