const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking");

// ✅ Static routes FIRST (before dynamic /:id)
router.get("/payment-success", bookingController.paymentSuccess);
router.get("/payment-cancel", bookingController.paymentCancel);
router.get("/my-bookings", bookingController.myBookings);

// ✅ Dynamic route LAST
router.post("/:id", bookingController.createCheckoutSession);

module.exports = router;