
const mongoose = require("mongoose");

const sessionRewardSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    
rewardType: {
  type: String,
  enum: ["completion", "host_review_bonus", "reviewer_bonus"],
  required: true,
},


    points: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Each user can receive a reward for a session only once.
sessionRewardSchema.index(
  { session: 1, user: 1, rewardType: 1 },
  { unique: true }
);

module.exports = mongoose.model("SessionReward", sessionRewardSchema);
