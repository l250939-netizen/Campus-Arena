const mongoose = require("mongoose");

const carpoolSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    journeyType: {
      type: String,
      enum: ["From Uni", "To Uni"],
      required: true,
    },
    startingLocation: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    stops: [
      {
        type: String,
        trim: true,
      },
    ],
    journeyDate: {
      type: Date,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    transportType: {
      type: String,
      enum: ["Bike", "Car", "Split InDrive"],
      required: true,
    },
    seatsAvailable: {
      type: Number,
      default: 0,
      min: 0,
    },
    fareType: {
      type: String,
      enum: ["Set Fare", "Decide in Person"],
      required: true,
    },
    fareAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    passengerPreference: {
      type: String,
      enum: ["Girls Only", "Anyone"],
      default: "Anyone",
    },
    status: {
      type: String,
      enum: ["Open", "Full", "Cancelled"],
      default: "Open",
    },
    requests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Carpool", carpoolSchema);
