document.getElementById("checkout-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const method = document.getElementById("method").value;

    if (!name || !email || !method) {
        alert("Please fill out all fields.");
        return;
    }

    if (method !== "credit") {
        alert("Currently only Credit Card (Stripe Checkout) is supported.");
        return;
    }

    const stripe = Stripe("pk_test_51RLihT06fYGoo1hnXCDBaCky0TOUapc4m2fsT5xIRvWSkstpiDkE2hnJgCQuYnyEIZhHfB0Jvv9JJMbRRz4OEi1X00Shtm04iW");

    try {
        // Step 1: Create Stripe Checkout session
        const response = await fetch("http://localhost:5000/api/payment/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token") // required for authMiddleware
            },
            body: JSON.stringify({
                items: [
                    {
                        name: "Sample Product",
                        price: 2000,
                        quantity: 1
                    }
                ],
                customer: {
                    name: name,
                    email: email
                }
            })
        });

        const data = await response.json();

        if (!data.url) {
            alert("Failed to initiate payment session.");
            return;
        }

        // ✅ Step 2: Clear cart before redirect
        await fetch("http://localhost:5000/api/cart", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        // Step 3: Redirect to Stripe Checkout
        window.location.href = data.url;

    } catch (error) {
        console.error("Checkout error:", error);
        alert("Something went wrong during payment.");
    }
});
