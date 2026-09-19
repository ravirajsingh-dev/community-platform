const mongoose = require("mongoose");
const { Schema } = mongoose;

const COMMON_SETTINGS_SINGLETON_KEY = "GLOBAL";

const CommonSettingsSchema = new Schema(
  {
    // General Information
    name: {
      type: String,
      required: true,
      trim: true,
      default: "PROJECT",
    },
    abbreviation: {
      type: String,
      trim: true,
      default: "",
    },
    developedBy: {
      type: String,
      trim: true,
      default: "",
    },
    developedByLink: {
      type: String,
      trim: true,
      default: "",
    },
    singletonKey: {
      type: String,
      required: true,
      default: COMMON_SETTINGS_SINGLETON_KEY,
      unique: true,
      index: true,
    },

    // Logo
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    logoKey: {
      type: String,
      trim: true,
      default: "",
    },

    // Social Media Links (admin-managed list)
    socialMedia: {
      links: [
        {
          id: { type: String, trim: true, default: "" },
          platform: { type: String, trim: true, default: "facebook" },
          url: { type: String, trim: true, default: "" },
          order: { type: Number, default: 0 },
        },
      ],
    },

    // Donation Settings
    donationEnabled: {
      type: Boolean,
      default: true,
    },
    donationTitle: {
      type: String,
      trim: true,
      default: "",
    },
    donationTitleHighlight: {
      type: String,
      trim: true,
      default: "",
    },
    donationMessage: {
      type: String,
      trim: true,
      default: "",
    },
    topDonationsEnabled: {
      type: Boolean,
      default: true,
    },
    topDonationsLimit: {
      type: Number,
      min: 1,
      max: 100,
      default: 20,
    },

    // Authentication Settings
    loginEnabled: {
      type: Boolean,
      default: true,
    },
    registerEnabled: {
      type: Boolean,
      default: true,
    },

    // Payment gateway toggle (credentials remain in env vars)
    paymentGateway: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: {
        type: String,
        trim: true,
        default: "cashfree",
      },
    },

    // Referral commission — per target (each membership plan + donation)
    referral: {
      enabled: {
        type: Boolean,
        default: false,
      },
      // Legacy global rate (used only when `targets` is empty)
      commissionType: {
        type: String,
        enum: ["percent", "flat"],
        default: "percent",
      },
      commissionValue: {
        type: Number,
        min: 0,
        default: 0,
      },
      targets: [
        {
          targetKey: {
            type: String,
            required: true,
            trim: true,
          },
          targetType: {
            type: String,
            enum: ["donation", "membership"],
            required: true,
          },
          planId: {
            type: Schema.Types.ObjectId,
            ref: "membership_plans",
            default: null,
          },
          commissionType: {
            type: String,
            enum: ["percent", "flat"],
            default: "percent",
          },
          commissionValue: {
            type: Number,
            min: 0,
            default: 0,
          },
        },
      ],
    },

    // Community hierarchy — which levels users may create inline (profile)
    userCreatableLevels: {
      type: [String],
      default: () => [
        "community",
        "vansh",
        "kul",
        "khamp",
        "subKhamp",
        "gotra",
      ],
    },

    // UPI Details
    upi: {
      upiId: {
        type: String,
        trim: true,
        default: "",
      },
      upiHolderName: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Bank Details
    bank: {
      bankName: {
        type: String,
        trim: true,
        default: "",
      },
      accountNo: {
        type: String,
        trim: true,
        default: "",
      },
      accountHolderName: {
        type: String,
        trim: true,
        default: "",
      },
      ifscCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Homepage gallery section (shared across all gallery images)
    gallery: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Homepage videos section (shared across all videos)
    video: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Homepage news section (shared across all news items)
    news: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Homepage "How Our Platform Works" section (0–10 steps; hide when empty)
    howItWorks: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      steps: [
        {
          id: { type: String, trim: true, default: "" },
          heading: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
          order: { type: Number, default: 0 },
        },
      ],
    },

    // Homepage hero overlay (shared across all slider banners)
    hero: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      tagline: {
        type: String,
        trim: true,
        default: "",
      },
      buttons: {
        type: [
          {
            id: { type: String, trim: true, default: "" },
            label: { type: String, trim: true, default: "" },
            path: { type: String, trim: true, default: "" },
            variant: {
              type: String,
              enum: ["primary", "outline", "ghost"],
              default: "ghost",
            },
            order: { type: Number, default: 0 },
          },
        ],
        default: () => [],
      },
    },

    // About Us Page Content
    aboutUs: {
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
      sections: [
        {
          id: { type: String, trim: true, default: "" },
          heading: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
          imageUrl: { type: String, trim: true, default: "" },
          imageKey: { type: String, trim: true, default: "" },
          order: { type: Number, default: 0 },
        },
      ],
    },

    // Contact Us Page Content
    contactUsPage: {
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
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      secondaryPhone: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
      businessHours: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Coming Soon — sidebar menu items + shared page copy
    comingSoon: {
      enabled: {
        type: Boolean,
        default: true,
      },
      title: {
        type: String,
        trim: true,
        default: "Coming Soon",
      },
      description: {
        type: String,
        trim: true,
        default:
          "This feature is under development and will be available soon.",
      },
      menuItems: [
        {
          id: {
            type: String,
            trim: true,
            default: "",
          },
          label: {
            type: String,
            trim: true,
            required: true,
          },
          slug: {
            type: String,
            trim: true,
            required: true,
          },
          description: {
            type: String,
            trim: true,
            default: "",
          },
          enabled: {
            type: Boolean,
            default: true,
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
      // Legacy field retained for backward compatibility
      initiatives: [
        {
          title: {
            type: String,
            trim: true,
            required: true,
          },
          description: {
            type: String,
            trim: true,
            default: "",
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

CommonSettingsSchema.index(
  { singletonKey: 1 },
  { unique: true, name: "common_settings_singleton_key_unique" },
);

// Ensure singletonKey before Mongoose validation (legacy docs may lack it).
CommonSettingsSchema.pre("validate", function () {
  if (!this.singletonKey) {
    this.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
  }
});

// Singleton guard: only one common settings document is allowed.
CommonSettingsSchema.pre("save", async function () {
  if (!this.isNew) {
    return;
  }

  const existingSettings = await this.constructor.exists({
    _id: { $ne: this._id },
  });
  if (existingSettings) {
    throw new Error("Not allowed: common settings already exist");
  }
});

// Static method to get or create settings (ensures only one document exists)
CommonSettingsSchema.statics.getOrCreateSettings = async function () {
  try {
    // Keep the oldest document and remove accidental duplicates.
    let settings = await this.findOne().sort({ createdAt: 1, _id: 1 });

    if (settings) {
      if (settings.singletonKey !== COMMON_SETTINGS_SINGLETON_KEY) {
        await this.updateOne(
          { _id: settings._id },
          { $set: { singletonKey: COMMON_SETTINGS_SINGLETON_KEY } },
        );
        // Re-fetch so in-memory doc matches DB (legacy docs may lack singletonKey).
        settings = await this.findById(settings._id);
      }

      await this.deleteMany({ _id: { $ne: settings._id } });
      return settings;
    }

    settings = await this.findOneAndUpdate(
      { singletonKey: COMMON_SETTINGS_SINGLETON_KEY },
      {
        $setOnInsert: {
          singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );
    console.log("✅ Common Settings Created");

    return settings;
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await this.findOne({
        singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
      });
      if (existing) {
        return existing;
      }
    }
    console.error("Error in getOrCreateSettings:", error);
    throw error;
  }
};

const CommonSettings = mongoose.model("common_settings", CommonSettingsSchema);

module.exports = CommonSettings;
module.exports.COMMON_SETTINGS_SINGLETON_KEY = COMMON_SETTINGS_SINGLETON_KEY;
