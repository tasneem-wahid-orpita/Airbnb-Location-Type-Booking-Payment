function startBooking() {
    const data = {
        property_id: selectedProperty.property_id,
        check_in_date: document.getElementById("checkInDate").value,
        check_out_date: document.getElementById("checkOutDate").value,
        name: document.getElementById("userName").value,
        email: document.getElementById("userEmail").value,
        phone: document.getElementById("userPhone").value,
        password: document.getElementById("userPassword").value
    };

    fetch("http://localhost:5000/bookings/start", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json().then(result => ({ status: response.status, result: result })))
    .then(({ status, result }) => {
        if (status !== 200) {
            document.getElementById("message").innerText = result.message;
            return;
        }

        currentBookingId = result.booking_id;

        document.getElementById("totalAmount").innerText = Number(result.total_amount).toFixed(2);
        document.getElementById("paymentStatus").innerText = "Unpaid";
        document.getElementById("paymentSection").style.display = "block";
        document.getElementById("message").innerText = "Booking created. Payment is unpaid.";
    })
    .catch(error => console.log(error));
}

function confirmPayment() {
    const payMethod = document.getElementById("payMethod").value;

    if (payMethod === "") {
        alert("Please select a payment method.");
        return;
    }

    fetch("http://localhost:5000/payments/" + currentBookingId + "/pay", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            pay_method: payMethod
        })
    })
    .then(response => response.json())
    .then(result => {
        document.getElementById("paymentStatus").innerText = "Paid";
        document.getElementById("status").innerText = "Unavailable";
        document.getElementById("message").innerText = result.message;
    })
    .catch(error => console.log(error));
}
