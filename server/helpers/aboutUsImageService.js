const { uploadToR2, deleteFromR2 } = require("./r2Helper");
const {
  MAX_IMAGE_SIZE_BYTES,
  IMAGE_SIZE_ERROR,
} = require("../constants/imageUpload");

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const uploadAboutUsImage = async (file) => {
  if (!file?.buffer) {
    throw new Error("Invalid file object");
  }
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error("Only jpg, jpeg, png, and webp images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(IMAGE_SIZE_ERROR);
  }

  const uploadResult = await uploadToR2(file, "about-us");
  return {
    url: uploadResult.url,
    key: uploadResult.key,
  };
};

const deleteAboutUsImage = async (imageKey) => {
  if (!imageKey) return true;
  try {
    await deleteFromR2(imageKey);
    return true;
  } catch (error) {
    console.error("Error deleting about-us image:", error);
    return false;
  }
};

module.exports = {
  uploadAboutUsImage,
  deleteAboutUsImage,
};
