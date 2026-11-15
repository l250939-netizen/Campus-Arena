jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

process.env.JWT_SECRET = "email-test-secret";
process.env.APP_URL = "http://localhost:5173";
process.env.SMTP_HOST = "smtp.test.invalid";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "campusarena@example.test";
process.env.SMTP_PASS = "test-password";
process.env.SMTP_FROM = "CampusArena <campusarena@example.test>";

jest.setTimeout(120000);

const crypto = require("crypto");
const request = require("supertest");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const app = require("../app");

const transporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
};

nodemailer.createTransport.mockReturnValue(transporter);

function registrationDetails(email = "student@nu.edu.pk") {
  return {
    fullName: "Campus Student",
    email,
    password: "securepass123",
    confirmPassword: "securepass123",
    university: "FAST Islamabad",
  };
}

function tokenFromMessage(message) {
  const match = message.match(/verify-email\?token=([a-f0-9]{64})/i);
  return match && match[1];
}

async function register(email) {
  return request(app)
    .post("/api/auth/register")
    .send(registrationDetails(email));
}

beforeAll(async () => {
  const mongoUri = new URL(process.env.MONGO_URI);
  mongoUri.pathname = "/campusarena_email_test";
  await mongoose.connect(mongoUri.toString());
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  transporter.sendMail.mockReset().mockResolvedValue({ messageId: "test-message" });
  transporter.verify.mockReset().mockResolvedValue(true);
});

describe("CampusArena email verification", () => {
  it("accepts university email addresses on nu.edu.pk subdomains", async () => {
    const response = await register("student@isb.nu.edu.pk");

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("student@isb.nu.edu.pk");
  });

  it("rejects domains that only contain but do not end with nu.edu.pk", async () => {
    const response = await register("student@notnu.edu.pk");

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/ending in nu\.edu\.pk/i);
  });

  it("sends a branded verification email and stores only the token hash", async () => {
    const email = "newstudent@nu.edu.pk";
    const response = await register(email);

    expect(response.status).toBe(201);
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.verificationToken).toBeUndefined();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.test.invalid",
        port: 587,
        secure: false,
        auth: { user: "campusarena@example.test", pass: "test-password" },
      })
    );

    const mail = transporter.sendMail.mock.calls[0][0];
    expect(mail.to).toBe(email);
    expect(mail.from).toBe(process.env.SMTP_FROM);
    expect(mail.subject).toMatch(/CampusArena/i);
    expect(mail.html).toContain("CampusArena");
    expect(mail.html).toContain("Verify Email");
    expect(mail.html).toContain(email);
    expect(mail.text).toContain(email);
    expect(mail.text).toContain("24 hours");

    const verificationToken = tokenFromMessage(mail.text);
    expect(verificationToken).toMatch(/^[a-f0-9]{64}$/i);

    const user = await User.findOne({ email }).select(
      "+verificationTokenHash +verificationTokenExpiresAt"
    );
    expect(user.emailVerified).toBe(false);
    expect(user.verificationTokenHash).toBe(
      crypto.createHash("sha256").update(verificationToken).digest("hex")
    );
    expect(user.verificationTokenHash).not.toBe(verificationToken);
    expect(user.verificationTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("accepts a valid token once and rejects invalid, expired, and reused tokens", async () => {
    const response = await register("verifyonce@nu.edu.pk");
    const verificationToken = tokenFromMessage(
      transporter.sendMail.mock.calls[0][0].text
    );

    const invalidResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "invalid-token" });
    expect(invalidResponse.status).toBe(400);

    const verifiedResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: verificationToken });
    expect(verifiedResponse.status).toBe(200);
    expect(verifiedResponse.body.user.emailVerified).toBe(true);

    const user = await User.findOne({ email: response.body.user.email }).select(
      "+verificationTokenHash +verificationTokenExpiresAt"
    );
    expect(user.verificationTokenHash).toBeNull();
    expect(user.verificationTokenExpiresAt).toBeNull();

    const reusedResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: verificationToken });
    expect(reusedResponse.status).toBe(400);
  });

  it("rejects expired verification tokens", async () => {
    const response = await register("expired@nu.edu.pk");
    const verificationToken = tokenFromMessage(
      transporter.sendMail.mock.calls[0][0].text
    );
    await User.updateOne(
      { email: response.body.user.email },
      { $set: { verificationTokenExpiresAt: new Date(Date.now() - 1000) } }
    );

    const verifyResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: verificationToken });

    expect(verifyResponse.status).toBe(400);
    expect(verifyResponse.body.user).toBeUndefined();
  });

  it("throttles resends and replaces a previous token after the cooldown", async () => {
    const email = "resend@nu.edu.pk";
    await register(email);
    const oldToken = tokenFromMessage(transporter.sendMail.mock.calls[0][0].text);

    const throttledResponse = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email });
    expect(throttledResponse.status).toBe(202);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    await User.updateOne(
      { email },
      { $set: { verificationTokenExpiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
    );

    const resendResponse = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email });
    expect(resendResponse.status).toBe(202);
    expect(transporter.sendMail).toHaveBeenCalledTimes(2);

    const newToken = tokenFromMessage(transporter.sendMail.mock.calls[1][0].text);
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);

    const oldTokenResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: oldToken });
    expect(oldTokenResponse.status).toBe(400);
  });

  it("uses the same generic resend response for missing and verified accounts", async () => {
    const email = "alreadyverified@nu.edu.pk";
    await register(email);
    const token = tokenFromMessage(transporter.sendMail.mock.calls[0][0].text);
    await request(app).post("/api/auth/verify-email").send({ token });
    transporter.sendMail.mockClear();

    const verifiedResponse = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email });
    const missingResponse = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "missing@nu.edu.pk" });

    expect(verifiedResponse.status).toBe(202);
    expect(missingResponse.status).toBe(202);
    expect(verifiedResponse.body).toEqual(missingResponse.body);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("keeps the account unverified and avoids exposing SMTP details when delivery fails", async () => {
    transporter.sendMail.mockRejectedValueOnce(new Error("SMTP authentication failed"));

    const response = await register("mailfailure@nu.edu.pk");

    expect(response.status).toBe(201);
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.verificationToken).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain("SMTP authentication failed");
  });

  it("allows an unverified user to log in but blocks session and carpool actions", async () => {
    await register("unverified@nu.edu.pk");
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "unverified@nu.edu.pk", password: "securepass123" });
    expect(loginResponse.status).toBe(200);

    const authorization = `Bearer ${loginResponse.body.token}`;
    const id = new mongoose.Types.ObjectId().toString();
    const sessionPayload = {
      title: "Restricted session",
      category: "Futsal",
      audience: "All",
      location: "Campus",
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      maxParticipants: 4,
    };

    const createSession = await request(app)
      .post("/api/sessions")
      .set("Authorization", authorization)
      .send(sessionPayload);
    const joinSession = await request(app)
      .post(`/api/sessions/${id}/join`)
      .set("Authorization", authorization);
    const createCarpool = await request(app)
      .post("/api/carpools")
      .set("Authorization", authorization)
      .send({});
    const joinCarpool = await request(app)
      .post(`/api/carpools/${id}/request`)
      .set("Authorization", authorization);

    expect(createSession.status).toBe(403);
    expect(joinSession.status).toBe(403);
    expect(createCarpool.status).toBe(403);
    expect(joinCarpool.status).toBe(403);
  });
});