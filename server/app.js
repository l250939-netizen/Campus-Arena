const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getServerConfig } = require("./config");

const app = express();
const config = getServerConfig();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (config.isProduction) {
        return callback(new Error("CORS policy rejected this origin."));
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const sessionRoutes = require("./routes/sessionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const authRoutes = require("./routes/authRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const carpoolRoutes = require("./routes/carpoolRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/carpools", carpoolRoutes);

app.get("/api", (req, res) => {
  res.json({
    message: "CampusArena API is running!",
  });
});

module.exports = app;
