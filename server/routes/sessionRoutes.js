const authMiddleware = require("../middleware/authMiddleware");
const express = require("express");
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

router.post("/", authMiddleware, async (req, res) => {
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
router.post("/:id/join", authMiddleware, async (req, res) => {
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

// PATCH: Edit a Session (creator only)
router.patch("/:id", authMiddleware, async (req, res) => {
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
router.delete("/:id", authMiddleware, async (req, res) => {
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
