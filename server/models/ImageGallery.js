const mongoose = require("mongoose");

const ImageGallerySchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ImageGallerySchema.index({ createdAt: -1 });

const ImageGallery = mongoose.model("image_galleries", ImageGallerySchema);

module.exports = ImageGallery;
