
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    university: {
      type: String,
      enum: ["FAST Islamabad"],
      default: "FAST Islamabad",
    },

    gender: {
      type: String,
      enum: ["Female", "Male", "Prefer not to say"],
      default: "Prefer not to say",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    verificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    verificationTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // Rewards paused on main; restore this field with the feature/rewards branch.
    // meritPoints: {
    //   type: Number,
    //   default: 0,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
