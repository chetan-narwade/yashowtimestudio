const express = require("express");
const router = express.Router();

const { createContact } = require("../controllers/page");
const isLoggedIn = require("../middlewares/isLoggedIn");

const Portfolio = require("../models/portfolio");

router.get("/", async (req, res) => {
  try {
    const items = await Portfolio.find({ isActive: true });

    res.render("home", {
      title: "Home",
      items,
      user: req.session.user || null
    });

  } catch (err) {
    console.log(err);
    res.send("Error loading page");
  }
});


router.get("/about", (req, res) => {
    res.render("about", { title: "About" });
});

router.get("/services", (req, res) => {
    res.render("services", { title: "Services" });
});

router.get("/contact", (req, res) => {
    res.render("contact", { title: "Contact" });
});

// Contact form submit
router.post("/api/contact", isLoggedIn, createContact);

module.exports = router;