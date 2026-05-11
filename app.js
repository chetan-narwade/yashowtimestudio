require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const rateLimit = require("express-rate-limit");

require("./config/passport");

const pageRoutes      = require("./routes/page");
const reviewRoutes    = require("./routes/review");
const portfolioRoutes = require("./routes/portfolio");
const authRoutes      = require("./routes/auth");
const contactRoutes   = require("./routes/conatct");
const chatRoutes      = require("./routes/chat");
const bookingRoutes   = require("./routes/booking");



const app = express();

/* ---------------- body parsers ---------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ---------------- trust proxy ---------------- */
app.set("trust proxy", 1);

/* ---------------- session ---------------- */
app.use(
  session({
    name: "session_id",
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

/* ---------------- passport ---------------- */
app.use(passport.initialize());
app.use(passport.session());

/* ---------------- rate limit (auth only) ---------------- */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/signup",                   authLimiter);
app.use("/signin",                   authLimiter);
app.use("/forgot-password",          authLimiter);
app.use("/send-otp",                 authLimiter);
app.use("/send-otp/forgot-password", authLimiter);
app.use("/google",                   authLimiter);
app.use("/auth/google",              authLimiter);

/* ---------------- view engine ---------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- locals ---------------- */
app.use((req, res, next) => {
  const user = req.session?.user || null;
  res.locals.isAuthenticated = !!user;
  res.locals.user = user;
  req.user = user;
  next();
});

/* ---------------- routes ---------------- */
app.use("/booking", bookingRoutes);
app.use("/", pageRoutes);
app.use("/", portfolioRoutes);
app.use("/", reviewRoutes);
app.use("/", authRoutes);
app.use("/", contactRoutes);
app.use("/", chatRoutes);

/* ---------------- database ---------------- */
const MONGOURL = process.env.MONGO_URI;

if (!MONGOURL) {
  console.log("❌ MONGO_URI missing in .env");
  process.exit(1);
}

mongoose.connect(MONGOURL, { family: 4 })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => {
    console.error("DB error ❌", err);
    process.exit(1);
  });

/* ---------------- server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
  console.log("KEY:", process.env.GROQ_API_KEY ? "✅ loaded" : "❌ missing");
});