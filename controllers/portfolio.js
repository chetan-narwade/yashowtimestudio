const Portfolio = require("../models/portfolio");
const cloudinary = require("../config/cloudinary");


// ======================
// GET portfolio page
// ======================
exports.getPortfolioPage = async (req, res) => {
  try {

    const cat = req.query.cat || "all";

    let works;

    if (cat === "all") {
      works = await Portfolio.find().sort({ createdAt: -1 });
    } else {
      works = await Portfolio.find({ category: cat }).sort({ createdAt: -1 });
    }

    res.render("portfolio", { works, cat });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading portfolio");
  }
};


// ======================
// ADD new portfolio work (admin only)
// ======================
exports.addPortfolioWork = async (req, res) => {
  try {
    const { title, subtitle, category, price } = req.body;

    // ✅ Validation
    if (!title || !subtitle || !category || !price) {
      return res.status(400).send("All fields are required");
    }

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // ✅ Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto"
    });

    // ✅ Save to DB
    await Portfolio.create({
      title,
      subtitle,
      category,
      price: Number(price), // store price properly
      media: {
        url: result.secure_url,
        public_id: result.public_id,
        type: result.resource_type
      }
    });

    res.redirect("/portfolio");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error while adding portfolio work");
  }
};

// ======================
// DELETE portfolio work (admin only)
// ======================
exports.deletePortfolioWork = async (req, res) => {
  try {

    const work = await Portfolio.findById(req.params.id);

    if (!work) {
      return res.redirect("/portfolio");
    }

    if (work.media && work.media.public_id) {
      await cloudinary.uploader.destroy(
        work.media.public_id,
        { resource_type: work.media.type }
      );
    }

    await Portfolio.findByIdAndDelete(req.params.id);

    res.redirect("/portfolio");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error while deleting portfolio work");
  }
};