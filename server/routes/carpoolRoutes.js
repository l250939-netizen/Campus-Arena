const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const requireVerifiedUser = require("../middleware/requireVerifiedUser");
const Carpool = require("../models/Carpool");
const User = require("../models/User");

const router = express.Router();

function formatCarpoolPayload(payload) {
  const cleaned = {
    journeyType: payload.journeyType,
    startingLocation: typeof payload.startingLocation === "string" ? payload.startingLocation.trim() : "",
    destination: typeof payload.destination === "string" ? payload.destination.trim() : "",
    stops: Array.isArray(payload.stops)
      ? payload.stops
          .map((stop) => (typeof stop === "string" ? stop.trim() : ""))
          .filter(Boolean)
      : [],
    journeyDate: payload.journeyDate,
    departureTime: typeof payload.departureTime === "string" ? payload.departureTime.trim() : "",
    transportType: payload.transportType,
    seatsAvailable: Number(payload.seatsAvailable || 0),
    fareType: payload.fareType,
    fareAmount: Number(payload.fareAmount || 0),
    notes: typeof payload.notes === "string" ? payload.notes.trim() : "",
    passengerPreference: payload.passengerPreference,
  };

  return cleaned;
}

function validateCarpoolPayload(payload) {
  const errors = [];
  const safe = formatCarpoolPayload(payload);

  if (!safe.journeyType || !["From Uni", "To Uni"].includes(safe.journeyType)) {
    errors.push("Journey type is required.");
  }

  if (!safe.startingLocation) {
    errors.push("Starting location is required.");
  }

  if (!safe.destination) {
    errors.push("Destination is required.");
  }

  if (!safe.journeyDate) {
    errors.push("Journey date is required.");
  }

  if (!safe.departureTime) {
    errors.push("Departure time is required.");
  }

  if (!safe.transportType || !["Bike", "Car", "Split InDrive"].includes(safe.transportType)) {
    errors.push("Transport type is required.");
  }

  if (!safe.fareType || !["Set Fare", "Decide in Person"].includes(safe.fareType)) {
    errors.push("Please choose a fare option.");
  }

  if (safe.fareType === "Set Fare" && safe.fareAmount <= 0) {
    errors.push("Enter a valid fare amount.");
  }

  if (safe.transportType === "Car" && (safe.seatsAvailable < 1 || Number.isNaN(safe.seatsAvailable))) {
    errors.push("Car pool offers must include at least 1 available seat.");
  }

  if (!safe.passengerPreference || !["Girls Only", "Anyone"].includes(safe.passengerPreference)) {
    errors.push("Passenger preference is required.");
  }

  return { safe, errors };
}

function getApprovedSeatCount(carpool) {
  return (carpool.requests || []).filter((request) => request.status === "approved").length;
}

router.get("/", async (req, res) => {
  try {
    const { journeyType } = req.query;
    const filter = { status: { $ne: "Cancelled" } };

    if (journeyType) {
      filter.journeyType = journeyType;
    }

    const carpools = await Carpool.find(filter)
      .sort({ journeyDate: 1, departureTime: 1 })
      .populate("creator", "fullName email gender")
      .lean();

    res.json(carpools);
  } catch (error) {
    res.status(500).json({ message: "Failed to load carpools." });
  }
});

router.get("/my", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const carpools = await Carpool.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .populate("creator", "fullName email")
      .populate("requests.user", "fullName email gender")
      .lean();

    res.json(carpools);
  } catch (error) {
    res.status(500).json({ message: "Failed to load your carpools." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid carpool ID." });
    }

    const carpool = await Carpool.findById(req.params.id)
      .populate("creator", "fullName email gender")
      .populate("requests.user", "fullName email gender")
      .lean();

    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found." });
    }

    return res.json(carpool);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load carpool details." });
  }
});

router.post("/", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { safe, errors } = validateCarpoolPayload(req.body);

    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    const carpool = await Carpool.create({
      ...safe,
      creator: req.user._id,
      status: "Open",
    });

    return res.status(201).json(carpool);
  } catch (error) {
    console.error("Carpool create error:", error);
    return res.status(400).json({ message: "Failed to create carpool.", error: error.message });
  }
});

router.post("/:id/request", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid carpool ID." });
    }

    const carpool = await Carpool.findById(id);

    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found." });
    }

    if (carpool.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot request to join your own carpool." });
    }

    if (carpool.status === "Cancelled") {
      return res.status(400).json({ message: "This carpool is no longer active." });
    }

    if (carpool.transportType === "Car") {
      const approvedSeatCount = getApprovedSeatCount(carpool);
      if (approvedSeatCount >= carpool.seatsAvailable) {
        return res.status(400).json({ message: "This carpool has no seats left." });
      }
    }

    const existingRequest = carpool.requests.find(
      (request) => request.user.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ message: "You already requested to join this carpool." });
    }

    if (carpool.passengerPreference === "Girls Only") {
      const user = await User.findById(req.user._id).select("gender");
      if (!user || user.gender !== "Female") {
        return res.status(403).json({ message: "This carpool is girls-only. Only female students can join." });
      }
    }

    carpool.requests.push({
      user: req.user._id,
      status: "pending",
      requestedAt: new Date(),
    });

    await carpool.save();

    return res.json({ message: "Join request sent successfully." });
  } catch (error) {
    console.error("Request join error:", error);
    return res.status(500).json({ message: "Failed to request a join." });
  }
});

router.patch("/:id/requests/:requestId", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid ID." });
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid request status." });
    }

    const carpool = await Carpool.findById(id);

    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found." });
    }

    if (carpool.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can manage requests." });
    }

    const targetRequest = carpool.requests.id(requestId);

    if (!targetRequest) {
      return res.status(404).json({ message: "Join request not found." });
    }

    if (status === "approved") {
      const approvedSeatCount = carpool.requests.filter(
        (request) => request.status === "approved"
      ).length;

      if (carpool.transportType === "Car" && approvedSeatCount >= carpool.seatsAvailable) {
        return res.status(400).json({ message: "This carpool has reached capacity." });
      }
    }

    targetRequest.status = status;

    if (carpool.transportType === "Car") {
      const approvedCount = carpool.requests.filter((request) => request.status === "approved").length;
      carpool.status = approvedCount >= carpool.seatsAvailable ? "Full" : "Open";
    }

    await carpool.save();

    return res.json({ message: `Request ${status}.` });
  } catch (error) {
    console.error("Manage carpool request error:", error);
    return res.status(500).json({ message: "Failed to update request status." });
  }
});

router.patch("/:id", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid carpool ID." });
    }

    const carpool = await Carpool.findById(id);

    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found." });
    }

    if (carpool.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own carpool." });
    }

    const { safe, errors } = validateCarpoolPayload({ ...carpool.toObject(), ...req.body });

    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    Object.assign(carpool, safe);
    await carpool.save();

    return res.json({ message: "Carpool updated successfully.", carpool });
  } catch (error) {
    console.error("Update carpool error:", error);
    return res.status(500).json({ message: "Failed to update carpool." });
  }
});

router.delete("/:id", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid carpool ID." });
    }

    const carpool = await Carpool.findById(id);

    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found." });
    }

    if (carpool.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own carpool." });
    }

    carpool.status = "Cancelled";
    await carpool.save();

    return res.json({ message: "Carpool cancelled successfully." });
  } catch (error) {
    console.error("Delete carpool error:", error);
    return res.status(500).json({ message: "Failed to cancel carpool." });
  }
});

module.exports = router;
