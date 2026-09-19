const mongoose = require("mongoose");
const { Schema } = mongoose;
const { LEGAL_PAGE_SLUGS, isLegalPageSlug } = require("../config/legalPages");

const LegalSectionSchema = new Schema(
  {
    heading: { type: String, default: "", trim: true },
    text: { type: String, default: "" },
  },
  { _id: false },
);

const LegalPageSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: [...LEGAL_PAGE_SLUGS],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    intro: {
      type: String,
      trim: true,
      default: "",
    },
    sections: {
      type: [LegalSectionSchema],
      default: [],
    },
    bodyText: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

let LegalPage;

LegalPageSchema.statics.ensureAllPages = async () => {
  for (const slug of LEGAL_PAGE_SLUGS) {
    await LegalPage.updateOne(
      { slug },
      { $setOnInsert: { slug, title: "", intro: "", sections: [], bodyText: "" } },
      { upsert: true },
    );
  }
};

LegalPageSchema.statics.assertSlug = (slug) => {
  if (!isLegalPageSlug(slug)) {
    const err = new Error("INVALID_LEGAL_PAGE_SLUG");
    err.code = "INVALID_LEGAL_PAGE_SLUG";
    throw err;
  }
};

LegalPage = mongoose.model("legal_pages", LegalPageSchema);

module.exports = LegalPage;
