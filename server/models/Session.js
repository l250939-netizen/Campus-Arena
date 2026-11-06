
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Futsal",
        "Cricket",
        "Basketball",
        "Tennis",
        "Table Tennis",
        "Badminton",
        "Volleyball",
        "Cards",
        "FIFA",
        "Tekken",
        "Study Session"
      ]
    },

    audience: {
      type: String,
      enum: ["All", "Girls only"],
      default: "All"
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    startTime: {
      type: Date,
      required: true
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 15
    },

    maxParticipants: {
      type: Number,
      required: true,
      min: 2
    },

    studyDetails: {
  topic: String,
  department: String,
  batch: String
},

createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true
},
participants: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
]


  },
  
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Session", sessionSchema);
