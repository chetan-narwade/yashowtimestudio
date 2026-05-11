const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking");

// Static routes FIRST
router.get("/payment-success", bookingController.paymentSuccess);
router.get("/payment-cancel",  bookingController.paymentCancel);
router.get("/my-bookings",     bookingController.myBookings);

// ✅ Fixed: was POST /:id
router.post("/create-order/:id", bookingController.createCheckoutSession);

module.exports = router;