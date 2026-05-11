const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({

  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    minlength: [3, "Title must be at least 3 characters"],
    maxlength: [100, "Title cannot exceed 100 characters"]
  },

  subtitle: {
    type: String,
    required: [true, "Subtitle is required"],
    trim: true,
    minlength: [3, "Subtitle must be at least 3 characters"],
    maxlength: [150, "Subtitle cannot exceed 150 characters"]
  },

  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["brand", "marketing", "tech", "social"],
    lowercase: true,
    trim: true
  },

  // ✅ FIXED: price at root level
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },

  isActive: {
    type: Boolean,
    default: true
  },

  media: {
    url: {
      type: String,
      required: [true, "Media URL is required"],
      trim: true,
      match: [
        /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|mp4|mov|webm))$/i,
        "Please provide a valid image or video URL"
      ]
    },

    public_id: {
      type: String,
      required: [true, "Media public_id is required"],
      trim: true
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: [true, "Media type is required"]
    }
  }

}, { timestamps: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);