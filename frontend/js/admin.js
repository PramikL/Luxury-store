document.addEventListener("DOMContentLoaded", function () {
    const productForm = document.getElementById("add-product-form");
    if (productForm) {
        productForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const name = document.getElementById("product-name").value;
            const price = document.getElementById("product-price").value;
            const image = document.getElementById("product-image").value;
            const description = document.getElementById("product-description").value;
            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:5000/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, price, image, description })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Product added successfully!");
                location.reload();
            } else {
                alert("Failed to add product: " + data.error);
            }
        });
    }
});
