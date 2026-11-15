const authMiddleware = require("../middleware/authMiddleware");
const requireVerifiedUser = require("../middleware/requireVerifiedUser");
const express = require("express");
const mongoose = require("mongoose");
const Session = require("../models/Session");

const router = express.Router();

// GET: Fetch all Sessions
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find().sort({
      startTime: 1
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch Sessions"
    });
  }
});


// GET: Fetch Sessions created by the logged-in user
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({
      createdBy: req.user._id
    }).sort({
      startTime: 1
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch your Sessions"
    });
  }
});


// POST: Create a new Session

router.post("/", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const session = await Session.create({
  ...req.body,
  createdBy: req.user._id
});

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create Session",
      error: error.message
    });
  }
});


// POST: Join a Session
router.post("/:id/join", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    const userId = req.user._id;

    if (session.createdBy.equals(userId)) {
      return res.status(400).json({
        message: "You cannot join your own Session."
      });
    }

    if (session.participants.some(
      (participantId) => participantId.equals(userId)
    )) {
      return res.status(400).json({
        message: "You have already joined this Session."
      });
    }

    const totalPeople = 1 + session.participants.length;

if (totalPeople >= session.maxParticipants) {
  return res.status(400).json({
    message: "This Session is full."
  });
}

    session.participants.push(userId);
    await session.save();

    res.json({
      message: "You joined the Session successfully.",
      session
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to join Session."
    });
  }
});

// POST: Record attendance for a joined participant
router.post("/:id/attendance", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId, attended } = req.body;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!session.createdBy.equals(req.user._id)) {
      return res.status(403).json({
        message: "Only the host can record attendance for this session."
      });
    }

    const endTime =
      new Date(session.startTime).getTime() +
      Number(session.durationMinutes) * 60 * 1000;

    if (Date.now() < endTime) {
      return res.status(400).json({
        message: "Attendance can only be recorded after the session ends."
      });
    }

    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: "A valid participant ID is required." });
    }

    const participantExists = session.participants.some((userId) => userId.equals(participantId));

    if (!participantExists) {
      return res.status(400).json({ message: "This student did not join the session." });
    }

    const attendanceEntry = session.attendance.find(
      (entry) => entry.user && entry.user.toString() === participantId
    );

    const present = Boolean(attended);

    if (attendanceEntry) {
      attendanceEntry.present = present;
      attendanceEntry.markedAt = new Date();
    } else {
      session.attendance.push({
        user: participantId,
        present,
        markedAt: new Date(),
      });
    }

    await session.save();

    return res.json({
      message: present ? "Attendance recorded." : "Attendance updated.",
      attendance: session.attendance,
    });
  } catch (error) {
    console.error("Attendance update error:", error);
    return res.status(500).json({ message: "Failed to record attendance." });
  }
});

// PATCH: Edit a Session (creator only)
router.patch("/:id", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    // Only the creator can edit this Session
    if (!session.createdBy.equals(req.user._id)) {
      return res.status(403).json({
        message: "You can only edit Sessions you created."
      });
    }

    // Only allow these fields to be changed
    const allowedFields = [
      "title",
      "category",
      "audience",
      "location",
      "startTime",
      "durationMinutes",
      "maxParticipants",
      "studyDetails"
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        session[field] = req.body[field];
      }
    }

    // Do not reduce the capacity below the current number of people
    const currentParticipants = 1 + session.participants.length;

    if (session.maxParticipants < currentParticipants) {
      return res.status(400).json({
        message: `Participant limit cannot be lower than the ${currentParticipants} people already in this Session.`
      });
    }

    await session.save();

    res.json({
      message: "Session updated successfully.",
      session
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update Session.",
      error: error.message
    });
  }
});


// DELETE: Cancel a Session (creator only)
router.delete("/:id", authMiddleware, requireVerifiedUser, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    // Only the creator can cancel this Session
    if (!session.createdBy.equals(req.user._id)) {
      return res.status(403).json({
        message: "You can only cancel Sessions you created."
      });
    }

    await session.deleteOne();

    res.json({
      message: "Session cancelled successfully."
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel Session."
    });
  }
});

module.exports = router;
