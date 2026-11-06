
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Session = require("../models/Session");
const SessionReward = require("../models/SessionReward");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const POINTS_PER_SESSION = 10;

// Claim merit points for a completed session.
// Only the session creator can trigger rewards.
// The reward record prevents duplicate awards.
router.post("/session/:sessionId/claim", authMiddleware, async (req, res) => {
  const mongoSession = await mongoose.startSession();

  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID." });
    }

    let awardedCount = 0;

    await mongoSession.withTransaction(async () => {
      const session = await Session.findById(sessionId).session(mongoSession);

      if (!session) {
        const error = new Error("Session not found.");
        error.status = 404;
        throw error;
      }

      if (!session.createdBy.equals(req.user._id)) {
        const error = new Error(
          "Only the session creator can finalize its rewards."
        );
        error.status = 403;
        throw error;
      }

      const endTime =
        new Date(session.startTime).getTime() +
        Number(session.durationMinutes) * 60 * 1000;

      if (Date.now() < endTime) {
        const error = new Error(
          "Merit points can only be awarded after the session ends."
        );
        error.status = 400;
        throw error;
      }

      // Only students who joined are eligible.
      const participantIds = [
        ...new Set(session.participants.map((id) => id.toString())),
      ];

      for (const participantId of participantIds) {
        // Unique index: one reward per user per session.
        const existingReward = await SessionReward.findOne({
          session: session._id,
          user: participantId,
        }).session(mongoSession);

        if (existingReward) continue;

        await SessionReward.create(
          [
            {
              session: session._id,
              user: participantId,
              points: POINTS_PER_SESSION,
            },
          ],
          { session: mongoSession }
        );

        await User.updateOne(
          { _id: participantId },
          { $inc: { meritPoints: POINTS_PER_SESSION } },
          { session: mongoSession }
        );

        awardedCount += 1;
      }
    });

    return res.json({
      message: `Rewards finalized. ${awardedCount} student(s) received points.`,
      pointsPerStudent: POINTS_PER_SESSION,
      studentsRewarded: awardedCount,
    });
  } catch (error) {
    console.error("Finalize rewards error:", error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "Could not finalize session rewards.",
    });
  } finally {
    await mongoSession.endSession();
  }
});

module.exports = router;
