
const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Session = require("../models/Session");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.get(
  "/session/:sessionId/mine",
  authMiddleware,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          message: "Invalid session ID.",
        });
      }

      const review = await Review.findOne({
        session: sessionId,
        reviewer: req.user._id,
      });

      return res.json({ review });
    } catch (error) {
      console.error("Fetch my review error:", error);

      return res.status(500).json({
        message: "Could not load your review.",
      });
    }
  }
);


// GET reviews for a session
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID." });
    }

    const reviews = await Review.find({ session: sessionId })
      .populate("reviewer", "fullName")
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return res.status(500).json({ message: "Could not load reviews." });
  }
});

// POST a review for a completed session
router.post("/session/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rating = Number(req.body.rating);
    const comment =
      typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID." });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be a whole number from 1 to 5.",
      });
    }

    if (comment.length > 500) {
      return res.status(400).json({
        message: "Comment cannot exceed 500 characters.",
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (session.createdBy.equals(req.user._id)) {
      return res.status(403).json({
        message: "You cannot review your own session.",
      });
    }

    const isParticipant = session.participants.some(
      (participantId) => participantId.equals(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Only participants who joined can review this session.",
      });
    }

    const endTime =
      new Date(session.startTime).getTime() +
      Number(session.durationMinutes) * 60 * 1000;

    if (Date.now() < endTime) {
      return res.status(400).json({
        message: "You can review this session after it ends.",
      });
    }

    const review = await Review.create({
      session: session._id,
      reviewer: req.user._id,
      rating,
      comment,
    });

    await review.populate("reviewer", "fullName");

    return res.status(201).json({
      message: "Review submitted successfully!",
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this session.",
      });
    }

    console.error("Submit review error:", error);
    return res.status(500).json({ message: "Could not submit review." });
  }
});

module.exports = router;
