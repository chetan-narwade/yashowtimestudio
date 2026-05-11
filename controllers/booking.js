const Booking = require("../models/booking");
const Portfolio = require("../models/portfolio");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ✅ STEP 1: Create Checkout Session
exports.createCheckoutSession = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const serviceId = req.params.id;

    const service = await Portfolio.findById(serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: service.title,
            },
            unit_amount: service.price * 100, // ₹ → paise
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${BASE_URL}/booking/payment-success?session_id={CHECKOUT_SESSION_ID}&serviceId=${serviceId}`,
      cancel_url: `${BASE_URL}/booking/payment-cancel`,
    });

    return res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe session error:", err.message);
    return res.status(500).json({ error: "Stripe session error" });
  }
};

// ✅ STEP 2: Verify Payment + Save Booking
exports.paymentSuccess = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/signin");
    }

    const { session_id, serviceId } = req.query;

    if (!session_id || !serviceId) {
      return res.status(400).send("Missing session_id or serviceId");
    }

    // ✅ Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).send("❌ Payment not verified");
    }

    const service = await Portfolio.findById(serviceId);
    if (!service) return res.status(404).send("Service not found");

    // ✅ Prevent duplicate booking
    const existing = await Booking.findOne({
      userId: req.session.user._id,
      serviceId,
      status: "paid",
    });

    if (existing) {
      return res.redirect("/booking/my-bookings?duplicate=true");
    }

    // ✅ Save booking — field names match schema exactly
    await Booking.create({
      userId:          req.session.user._id,
      serviceId,
      status:          "paid",
      amount:          service.price,
      paymentIntentId: session.payment_intent,  // ✅ fixed: was paymentId
      sessionId:       session.id,              // ✅ fixed: was orderId
    });

    return res.redirect("/booking/my-bookings?success=true");

  } catch (err) {
    console.error("❌ Booking error:", err.message);
    return res.status(500).send("Booking failed");
  }
};

// ✅ STEP 3: My Bookings Page
exports.myBookings = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/signin");
    }

    const bookings = await Booking.find({ userId: req.session.user._id })
      .populate("serviceId")   // ✅ works now — ref is "Portfolio"
      .sort({ createdAt: -1 });

    res.render("my-bookings", {
      bookings,
      user:      req.session.user,
      success:   req.query.success   || false,
      duplicate: req.query.duplicate || false,
    });

  } catch (err) {
    console.error("❌ My bookings error:", err.message);
    res.status(500).send("Failed to load bookings");
  }
};

// ✅ STEP 4: Cancel
exports.paymentCancel = (req, res) => {
  res.redirect("/?cancelled=true");
};