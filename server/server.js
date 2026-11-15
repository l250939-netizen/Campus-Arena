
const mongoose = require("mongoose");
const app = require("./app");
const { getServerConfig } = require("./config");
const { verifySmtpConnection } = require("./utils/smtpService");

const config = getServerConfig();
const PORT = config.port;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (config.isProduction) {
      const requiredProductionVars = ["APP_URL", "SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
      const missing = requiredProductionVars.filter((key) => !process.env[key]);

      if (missing.length > 0) {
        throw new Error(`Missing production env vars: ${missing.join(", ")}`);
      }

      if (new URL(config.appUrl).protocol !== "https:") {
        throw new Error("APP_URL must use HTTPS in production.");
      }
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true,
    });

    console.log("MongoDB connected successfully!");
    await verifySmtpConnection();

    app.listen(PORT, () => {
      console.log(`CampusArena server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
