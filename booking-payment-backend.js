app.post("/bookings/start", (req, res) => {
    const {
        property_id,
        name,
        email,
        phone,
        password,
        check_in_date,
        check_out_date
    } = req.body;

    if (!property_id || !name || !email || !phone || !password || !check_in_date || !check_out_date) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
        res.status(400).json({ message: "Check-in date cannot be before today" });
        return;
    }

    if (checkOut <= checkIn) {
        res.status(400).json({ message: "Check-out date must be after check-in date" });
        return;
    }

    const propertySql = "SELECT * FROM properties WHERE property_id = ?";

    db.query(propertySql, [property_id], (err, propertyResult) => {
        if (err) {
            res.status(500).json({ error: err });
            return;
        }

        if (propertyResult.length === 0) {
            res.status(404).json({ message: "Property not found" });
            return;
        }

        const property = propertyResult[0];

        if (property.status.toLowerCase() !== "available") {
            res.status(400).json({ message: "This Airbnb is unavailable now" });
            return;
        }

        const overlapSql = `
            SELECT *
            FROM bookings
            WHERE property_id = ?
            AND check_in_date < ?
            AND check_out_date > ?
        `;

        db.query(overlapSql, [property_id, check_out_date, check_in_date], (err, overlapResult) => {
            if (err) {
                res.status(500).json({ error: err });
                return;
            }

            if (overlapResult.length > 0) {
                res.status(409).json({
                    message: "These dates are already booked for this Airbnb"
                });
                return;
            }

            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            const total_amount = nights * Number(property.price_per_night);

            const findUserSql = "SELECT * FROM users WHERE email = ?";

            db.query(findUserSql, [email], (err, userResult) => {
                if (err) {
                    res.status(500).json({ error: err });
                    return;
                }

                if (userResult.length > 0) {
                    const existingUser = userResult[0];

                    if (existingUser.password !== password) {
                        res.status(401).json({
                            message: "This email already exists with a different password"
                        });
                        return;
                    }

                    createBooking(existingUser.user_id);
                } else {
                    const insertUserSql = `
                        INSERT INTO users (name, email, phone, password)
                        VALUES (?, ?, ?, ?)
                    `;

                    db.query(insertUserSql, [name, email, phone, password], (err, insertResult) => {
                        if (err) {
                            res.status(500).json({ error: err });
                            return;
                        }

                        createBooking(insertResult.insertId);
                    });
                }
            });

            function createBooking(user_id) {
                const insertBookingSql = `
                    INSERT INTO bookings
                    (check_in_date, check_out_date, total_amount, property_id, user_id)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.query(
                    insertBookingSql,
                    [check_in_date, check_out_date, total_amount, property_id, user_id],
                    (err, bookingResult) => {
                        if (err) {
                            res.status(500).json({ error: err });
                            return;
                        }

                        const booking_id = bookingResult.insertId;

                        const insertPaymentSql = `
                            INSERT INTO payments
                            (pay_date, amount, pay_method, pay_status, booking_id)
                            VALUES (CURDATE(), ?, NULL, 'unpaid', ?)
                        `;

                        db.query(insertPaymentSql, [total_amount, booking_id], (err, paymentResult) => {
                            if (err) {
                                res.status(500).json({ error: err });
                                return;
                            }

                            res.json({
                                message: "Booking created. Payment is unpaid.",
                                booking_id: booking_id,
                                pay_id: paymentResult.insertId,
                                total_amount: total_amount,
                                pay_status: "unpaid"
                            });
                        });
                    }
                );
            }
        });
    });
});

app.put("/payments/:booking_id/pay", (req, res) => {
    const bookingId = req.params.booking_id;
    const { pay_method } = req.body;

    if (!pay_method) {
        res.status(400).json({ message: "Payment method is required" });
        return;
    }

    const updatePaymentSql = `
        UPDATE payments
        SET pay_method = ?, pay_status = 'paid', pay_date = CURDATE()
        WHERE booking_id = ?
    `;

    db.query(updatePaymentSql, [pay_method, bookingId], (err, paymentResult) => {
        if (err) {
            res.status(500).json({ error: err });
            return;
        }

        if (paymentResult.affectedRows === 0) {
            res.status(404).json({ message: "Payment record not found" });
            return;
        }

        res.json({
            message: "Payment confirmed. Booking is complete.",
            booking_id: bookingId,
            pay_status: "paid"
        });
    });
});
