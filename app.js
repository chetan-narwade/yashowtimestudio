require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("passport");
const rateLimit = require("express-rate-limit");

require("./config/passport");

const pageRoutes = require("./routes/page");
const reviewRoutes = require("./routes/review");
const portfolioRoutes = require("./routes/portfolio");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/conatct");

const app = express();

/* ---------------- security ---------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",  // ✅ Font Awesome
          "https://cdn.jsdelivr.net",       // ✅ Bootstrap CSS
        ],

        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",  // ✅ Font Awesome font files
        ],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",               // ✅ inline scripts
          "https://cdn.jsdelivr.net",       // ✅ Bootstrap JS
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https://www.gstatic.com",
          "https://res.cloudinary.com",    // ✅ portfolio images
        ],

        mediaSrc: [
          "'self'",
          "https://res.cloudinary.com",    // ✅ portfolio videos
        ],
      },
    },
  })
);

/* ---------------- body parsers ---------------- */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ---------------- trust proxy (important if deployed later) ---------------- */

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
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

/* ---------------- passport ---------------- */

app.use(passport.initialize());
app.use(passport.session());

/* ---------------- rate limit only for auth ---------------- */

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/", (req, res, next) => {
  // apply limiter only for auth routes
  if (
    req.path.startsWith("/signup") ||
    req.path.startsWith("/signin") ||
    req.path.startsWith("/forgot-password") ||
    req.path.startsWith("/send-otp") ||
    req.path.startsWith("/google") ||
    req.path.startsWith("/auth/google")
  ) {
    return authLimiter(req, res, next);
  }
  next();
});

/* ---------------- view engine ---------------- */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- locals ---------------- */

app.use((req, res, next) => {

  const user = req.session && req.session.user
    ? req.session.user
    : null;

  res.locals.isAuthenticated = !!user;
  res.locals.user = user;
  req.user = user;

  next();
});

/* ---------------- routes ---------------- */

app.use("/", pageRoutes);
app.use("/", portfolioRoutes);
app.use("/", reviewRoutes);
app.use("/", authRoutes);
app.use("/", contactRoutes);

/* ---------------- database ---------------- */

const MONGOURL = process.env.MONGO_URI;

if (!MONGOURL) {
  console.log("❌ MONGO_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGOURL)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => {
    console.error("DB error ❌", err);
    process.exit(1);
  });

/* ---------------- server ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
