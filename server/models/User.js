const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  encryptPassword,
  decryptPassword,
} = require("../utils/passwordEncryption");

const UserSchema = new Schema(
  {
    memberId: {
      type: String,
      unique: true,
      required: true,
      immutable: true,
      index: true,
      minlength: 13,
      maxlength: 13,
    },
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: true,
      index: true,
      immutable: true,
      minlength: 10,
      maxlength: 10,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      required: false,
      minlength: 10,
      maxlength: 10,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
    },
    pwdRef: {
      type: String,
      required: true,
      minlength: 6,
    },
    status: {
      type: Number,
      default: 4, // 1 = Active, 2 = Inactive, 3 = Blocked, 4 = New
      enum: [1, 2, 3, 4],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    renewalDate: {
      type: Date,
      required: false,
    },
    isLifetimePaid: {
      type: Boolean,
      default: false,
    },
    membershipPlanId: {
      type: Schema.Types.ObjectId,
      ref: "membership_plans",
      required: false,
      index: true,
    },
    subscriptionStartDate: {
      type: Date,
      required: false,
    },
    // Optional referrer's memberId (e.g. 9876543210-01)
    referralId: {
      type: String,
      required: false,
      index: true,
      minlength: 13,
      maxlength: 13,
    },
    // Lifetime count of referred users who became Active at least once.
    // Increments on first Active; decrements when that referred user is deleted.
    referralCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Set true after this user has been counted toward their referrer's referralCount.
    referralCounted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Selected at registration / wallet create; copied into UserDetails later
    community: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      required: false,
      index: true,
    },
    last_login: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    uuid: {
      type: String,
      maxlength: 64,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual property for backward compatibility
UserSchema.virtual("passwordCopy")
  .get(function () {
    if (this.pwdRef) {
      return decryptPassword(this.pwdRef);
    }
    return null;
  })
  .set(function (value) {
    this.pwdRef = value ? encryptPassword(value) : null;
  });

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// Pre-save middleware
UserSchema.pre("save", async function () {
  if (this.passwordCopy && !this.pwdRef) {
    this.pwdRef = this.passwordCopy;
    delete this.passwordCopy;
  }

  if (
    this.pwdRef &&
    typeof this.pwdRef === "string" &&
    !this.pwdRef.includes(":")
  ) {
    const encrypted = encryptPassword(this.pwdRef);
    if (encrypted) {
      this.pwdRef = encrypted;
    }
  }
});

// Pre-update middleware
UserSchema.pre(
  ["updateOne", "findOneAndUpdate", "updateMany"],
  async function () {
    const update = this.getUpdate();

    if (
      update?.pwdRef &&
      typeof update.pwdRef === "string" &&
      !update.pwdRef.includes(":")
    ) {
      update.pwdRef = encryptPassword(update.pwdRef);
    }

    if (
      update?.$set?.pwdRef &&
      typeof update.$set.pwdRef === "string" &&
      !update.$set.pwdRef.includes(":")
    ) {
      update.$set.pwdRef = encryptPassword(update.$set.pwdRef);
    }
  },
);

const User = mongoose.model("users", UserSchema);
module.exports = User;
