
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getServerConfig } = require("../config");
const { isSmtpConfigured, sendEmail } = require("../utils/smtpService");

const router = express.Router();

const REWARDS_ENABLED = false;
const universityEmailPattern = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)*nu\.edu\.pk$/i;
const serverConfig = getServerConfig();
const verificationTokenLifetimeMs = 24 * 60 * 60 * 1000;
const configuredResendCooldownMs = Number(process.env.VERIFICATION_RESEND_COOLDOWN_MS || 60000);
const resendCooldownMs = Number.isFinite(configuredResendCooldownMs) && configuredResendCooldownMs >= 0
  ? configuredResendCooldownMs
  : 60000;

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    university: user.university,
    gender: user.gender,
    emailVerified: user.emailVerified,
    ...(REWARDS_ENABLED ? { meritPoints: user.meritPoints } : {}),
  };
}

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(String.fromCharCode(34), "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendVerificationEmail(user, token) {
  if (!isSmtpConfigured()) {
    return { sent: false, notConfigured: true };
  }

  try {
    const verificationUrl = new URL("/verify-email", serverConfig.appUrl);

    if (serverConfig.isProduction && verificationUrl.protocol !== "https:") {
      console.error("Verification email not sent: APP_URL must use HTTPS in production.");
      return { sent: false };
    }

    verificationUrl.searchParams.set("token", token);

    const safeName = escapeHtml(user.fullName);
    const safeEmail = escapeHtml(user.email);
    const safeUrl = escapeHtml(verificationUrl.toString());

    await sendEmail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Verify your CampusArena account",
      text: [
        `Welcome to CampusArena, ${user.fullName}.`,
        `Registration email: ${user.email}`,
        "Verify your email using this link:",
        verificationUrl.toString(),
        "This link expires in 24 hours. If it expires, return to CampusArena and request another verification email.",
      ].join("\n\n"),
      html: `
        <!doctype html>
        <html lang="en">
          <body style="margin:0;padding:24px;background:#f4f6ef;font-family:Arial,sans-serif;color:#1c2920;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e7da;border-radius:12px;">
              <tr><td style="padding:28px 32px 12px;">
                <p style="margin:0;color:#52670a;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">CampusArena</p>
                <h1 style="margin:18px 0 12px;font-size:24px;line-height:1.25;">Welcome to the arena, ${safeName}.</h1>
                <p style="margin:0 0 12px;line-height:1.6;">Confirm your university email address to activate your CampusArena account.</p>
                <p style="margin:0 0 24px;color:#526052;font-size:14px;">Registration email: <strong>${safeEmail}</strong></p>
                <p style="margin:0 0 24px;"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#d8ff3e;color:#1c2920;font-weight:bold;text-decoration:none;">Verify Email</a></p>
                <p style="margin:0 0 12px;color:#526052;font-size:14px;line-height:1.6;">This link expires in 24 hours. If it expires, return to CampusArena and request another verification email.</p>
                <p style="margin:0 0 8px;color:#526052;font-size:13px;">If the button does not work, open this link:</p>
                <p style="margin:0 0 28px;overflow-wrap:anywhere;font-size:13px;"><a href="${safeUrl}" style="color:#52670a;">${safeUrl}</a></p>
              </td></tr>
            </table>
          </body>
        </html>
      `,
    });

    return { sent: true };
  } catch {
    console.error("Verification email could not be prepared or sent.");
    return { sent: false };
  }
}

async function createVerificationRecord(user) {
  const token = generateVerificationToken();
  const tokenHash = hashToken(token);

  user.verificationTokenHash = tokenHash;
  user.verificationTokenExpiresAt = new Date(Date.now() + verificationTokenLifetimeMs);
  await user.save();

  return token;
}

function localVerificationFallback(emailResult, token) {
  if (!emailResult.notConfigured || serverConfig.isProduction) {
    return {};
  }

  return {
    verificationToken: token,
    verificationInstructions:
      "SMTP is not configured. This development-only token can be used to verify the account locally.",
  };
}

function resendResponse(emailResult, token) {
  return {
    message: "If an account exists and is eligible, a verification email will be sent shortly.",
    ...localVerificationFallback(emailResult, token),
  };
}

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please log in to continue." });
    }

    const token = authHeader.split(" ")[1];
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Account not found." });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired login. Please log in again." });
  }
});

if (REWARDS_ENABLED) {
router.get("/leaderboard", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please log in to continue." });
    }

    const token = authHeader.split(" ")[1];
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Account not found." });
    }

    const leaderboard = await User.find({ university: "FAST Islamabad" })
      .sort({ meritPoints: -1, fullName: 1 })
      .limit(10)
      .lean();

    return res.json(
      leaderboard.map((member, index) => ({
        rank: index + 1,
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        meritPoints: member.meritPoints || 0,
        emailVerified: member.emailVerified,
      }))
    );
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired login. Please log in again." });
  }
});
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, university, gender } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string" ||
      university !== "FAST Islamabad"
    ) {
      return res.status(400).json({
        message: "Please provide valid registration details.",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    if (!universityEmailPattern.test(cleanEmail)) {
      return res.status(400).json({
        message: "Use a university email ending in nu.edu.pk, such as student@isb.nu.edu.pk.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const permittedGenders = ["Female", "Male", "Prefer not to say"];
    const normalizedGender = permittedGenders.includes(gender) ? gender : "Prefer not to say";

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName: cleanName,
      email: cleanEmail,
      passwordHash,
      university,
      gender: normalizedGender,
      emailVerified: false,
    });

    const verificationToken = await createVerificationRecord(user);
    const emailResult = await sendVerificationEmail(user, verificationToken);
    const fallback = localVerificationFallback(emailResult, verificationToken);

    return res.status(201).json({
      message: emailResult.sent
        ? "Account created. Please verify your university email to activate your account."
        : emailResult.notConfigured && !serverConfig.isProduction
          ? "Account created. SMTP is not configured; use the development verification token below."
          : "Account created, but the verification email could not be sent. Please request another email later.",
      user: publicUser(user),
      verificationEmailSent: emailResult.sent,
      ...fallback,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        message: "Verification token is required.",
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(token.trim())) {
      return res.status(400).json({
        message: "Verification token is invalid or expired.",
      });
    }

    const matchingUser = await User.findOne({
      emailVerified: false,
      verificationTokenHash: hashToken(token.trim()),
      verificationTokenExpiresAt: { $gt: new Date() },
    }).select("+verificationTokenHash");

    if (!matchingUser) {
      return res.status(400).json({
        message: "Verification token is invalid or expired.",
      });
    }

    matchingUser.emailVerified = true;
    matchingUser.verificationTokenHash = null;
    matchingUser.verificationTokenExpiresAt = null;
    await matchingUser.save();

    return res.json({
      message: "Email verified successfully.",
      user: publicUser(matchingUser),
    });
  } catch (error) {
    console.error("Email verification error:", error.message);
    return res.status(500).json({
      message: "Email verification failed.",
    });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !universityEmailPattern.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid university email." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select("+verificationTokenExpiresAt");

    if (!user || user.emailVerified) {
      return res.status(202).json(resendResponse({}, undefined));
    }

    const expiresAt = user.verificationTokenExpiresAt?.getTime();
    const issuedAt = expiresAt - verificationTokenLifetimeMs;

    if (Number.isFinite(issuedAt) && Date.now() - issuedAt < resendCooldownMs) {
      return res.status(202).json(resendResponse({}, undefined));
    }

    const verificationToken = await createVerificationRecord(user);
    const emailResult = await sendVerificationEmail(user, verificationToken);

    return res.status(202).json(resendResponse(emailResult, verificationToken));
  } catch (error) {
    console.error("Resend verification error:", error.message);
    return res.status(202).json(resendResponse({}, undefined));
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: publicUser(user),
      requiresEmailVerification: !user.emailVerified,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
});

router.post("/logout", (req, res) => {
  return res.json({ message: "Logged out successfully." });
});

module.exports = router;
