// controllers/bookingController.js

const Booking = require("../models/booking");
const Portfolio = require("../models/portfolio");
const crypto = require("crypto");

const {
  Cashfree,
  CFEnvironment,
} = require("cashfree-pg");

// ======================================================
// BASE URL
// ======================================================

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ======================================================
// CASHFREE CONFIG (v4.2.0)
// ======================================================

Cashfree.XClientId     = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;

// Auto-switch based on NODE_ENV
Cashfree.XEnvironment =
  process.env.NODE_ENV === "production"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

// ======================================================
// GENERATE ORDER ID
// ======================================================

function generateOrderId() {
  return "order_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");
}

// ======================================================
// CREATE ORDER
// POST /booking/create-order/:id
// ======================================================

exports.createCheckoutSession = async (req, res) => {
  try {

    // ── Auth check ──────────────────────────────────
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        error: "Please login first",
      });
    }

    // ── Find service ────────────────────────────────
    const service = await Portfolio.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: "Service not found",
      });
    }

    // ── Validate price ──────────────────────────────
    const amount = Number(service.price);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid service amount",
      });
    }

    // ── Build Cashfree order ────────────────────────
    const request = {
      order_id:       generateOrderId(),
      order_amount:   amount,
      order_currency: "INR",
      customer_details: {
        customer_id:    req.session.user._id.toString(),
        customer_name:  req.session.user.name  || "Customer",
        customer_email: req.session.user.email || "test@gmail.com",
        customer_phone: req.session.user.phone || "9999999999",
      },
      order_meta: {
        // {order_id} is a Cashfree placeholder — do NOT change to JS template syntax
        return_url: `${BASE_URL}/booking/payment-success?order_id={order_id}`,
        notify_url: `${BASE_URL}/booking/webhook`,
      },
      order_tags: {
        serviceId: service._id.toString(),
      },
    };

    // ── Create order ────────────────────────────────
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    const order    = response.data;

    return res.json({
      success:            true,
      payment_session_id: order.payment_session_id,
      order_id:           order.order_id,
    });

  } catch (err) {
    console.error(
      "Cashfree create-order error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      error:   err.response?.data || err.message || "Could not create order",
    });
  }
};

// ======================================================
// PAYMENT SUCCESS
// GET /booking/payment-success
// ======================================================

exports.paymentSuccess = async (req, res) => {
  try {

    // ── Auth check ──────────────────────────────────
    if (!req.session.user) {
      return res.redirect("/signin");
    }

    // ── Get order_id from query ─────────────────────
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).send("Missing order_id");
    }

    // ── Fetch & verify order from Cashfree ──────────
    const response = await Cashfree.PGFetchOrder("2023-08-01", order_id);
    const order    = response.data;

    if (order.order_status !== "PAID") {
      console.warn("Payment not completed. Status:", order.order_status);
      return res.status(400).send("Payment not verified");
    }

    // ── Get serviceId from verified order_tags ──────
    const serviceId = order.order_tags?.serviceId;
    if (!serviceId) {
      console.error("Missing serviceId in order_tags for order:", order_id);
      return res.status(400).send("Service ID missing");
    }

    const service = await Portfolio.findById(serviceId);
    if (!service) {
      return res.status(404).send("Service not found");
    }

    // ── Duplicate booking check ─────────────────────
    const existingBooking = await Booking.findOne({ sessionId: order.order_id });
    if (existingBooking) {
      return res.redirect("/booking/my-bookings?duplicate=true");
    }

    // ── Save booking ────────────────────────────────
    await Booking.create({
      userId:          req.session.user._id,
      serviceId:       service._id,
      status:          "paid",
      amount:          order.order_amount,  // from verified order
      paymentIntentId: order.cf_order_id,
      sessionId:       order.order_id,
    });

    return res.redirect("/booking/my-bookings?success=true");

  } catch (err) {
    console.error(
      "Payment verification error:",
      err.response?.data || err.message
    );
    return res.status(500).send("Booking failed");
  }
};

// ======================================================
// MY BOOKINGS
// GET /booking/my-bookings
// ======================================================

exports.myBookings = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.redirect("/signin");
    }

    const bookings = await Booking.find({ userId: req.session.user._id })
      .populate("serviceId")
      .sort({ createdAt: -1 });

    return res.render("my-bookings", {
      bookings,
      user:      req.session.user,
      success:   req.query.success   === "true",
      duplicate: req.query.duplicate === "true",
    });

  } catch (err) {
    console.error("My bookings error:", err.message);
    return res.status(500).send("Failed to load bookings");
  }
};

// ======================================================
// PAYMENT CANCEL
// GET /booking/payment-cancel
// ======================================================

exports.paymentCancel = (req, res) => {
  return res.redirect("/?cancelled=true");
};