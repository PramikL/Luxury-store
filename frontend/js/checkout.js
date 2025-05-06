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

    // Replace with your Stripe publishable key
    const stripe = Stripe("pk_test_51RLihT06fYGoo1hnXCDBaCky0TOUapc4m2fsT5xIRvWSkstpiDkE2hnJgCQuYnyEIZhHfB0Jvv9JJMbRRz4OEi1X00Shtm04iW");

    try {
        const response = await fetch("http://localhost:5000/api/payment/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: [
                    // You can later populate this from actual cart data
                    {
                        name: "Sample Product",
                        price: 2000, // in cents ($20.00)
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

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Failed to initiate payment session.");
        }
    } catch (error) {
        console.error("Checkout error:", error);
        alert("Something went wrong during payment.");
    }
});
