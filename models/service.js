const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Service name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"]
  },

  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true
  },

  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },

  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["SEO", "Marketing", "Design", "Development", "Other"]
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);