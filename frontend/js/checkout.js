document.getElementById("checkout-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const card = document.getElementById("card").value.trim();
    const method = document.getElementById("method").value;

    if (!name || !email || !card || !method) {
        alert("Please fill out all fields.");
        return;
    }

    // Simulate successful payment
    alert(`Payment successful!\n\nName: ${name}\nMethod: ${method}`);
    
    // Redirect or clear form
    document.getElementById("checkout-form").reset();
});
