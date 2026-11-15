process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

jest.setTimeout(120000);

const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");

describe("CampusArena auth and session flow", () => {
  beforeAll(async () => {
    const mongoUri = new URL(process.env.MONGO_URI);
    mongoUri.pathname = "/campusarena_test";
    await mongoose.connect(mongoUri.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it("registers a student with a FAST university email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Ali Khan",
        email: "ali@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("ali@nu.edu.pk");
    expect(response.body.user.emailVerified).toBe(false);

    const verificationResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: response.body.verificationToken });

    expect(verificationResponse.status).toBe(200);
    expect(verificationResponse.body.user.emailVerified).toBe(true);
  });

  it("logs in and creates a session for an authenticated user", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Maria Noor",
        email: "maria@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    expect(registerResponse.status).toBe(201);

    const verifyResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: registerResponse.body.verificationToken });

    expect(verifyResponse.status).toBe(200);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "maria@nu.edu.pk",
        password: "securepass123",
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTruthy();

    const sessionResponse = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({
        title: "Evening Futsal",
        category: "Futsal",
        audience: "All",
        location: "Sports Ground",
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        maxParticipants: 10,
      });

    expect(sessionResponse.status).toBe(201);
    expect(sessionResponse.body.title).toBe("Evening Futsal");
    expect(sessionResponse.body.createdBy).toBeTruthy();
  });

  it("returns the authenticated profile without exposing disabled reward scores", async () => {
    const first = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Ayesha Ali",
        email: "ayesha@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    const second = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Bilal Shah",
        email: "bilal@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: first.body.verificationToken });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: second.body.verificationToken });

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "ayesha@nu.edu.pk",
        password: "securepass123",
      });

    const profileResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    const leaderboardResponse = await request(app)
      .get("/api/auth/leaderboard")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.user).not.toHaveProperty("meritPoints");
    expect(leaderboardResponse.status).toBe(404);
  });

  it("keeps reward claims unavailable on the main application", async () => {
    const host = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Host User",
        email: "host@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    const attendee = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Attendee User",
        email: "attendee@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
      });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: host.body.verificationToken });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: attendee.body.verificationToken });

    const hostLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "host@nu.edu.pk",
        password: "securepass123",
      });

    const attendeeLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "attendee@nu.edu.pk",
        password: "securepass123",
      });

    const sessionResponse = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${hostLogin.body.token}`)
      .send({
        title: "Completed Study Sprint",
        category: "Study Session",
        audience: "All",
        location: "Library",
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 30,
        maxParticipants: 10,
        studyDetails: {
          topic: "Algorithms",
          department: "CS",
          batch: "2024",
        },
      });

    const sessionId = sessionResponse.body._id;

    const joinResponse = await request(app)
      .post(`/api/sessions/${sessionId}/join`)
      .set("Authorization", `Bearer ${attendeeLogin.body.token}`);

    expect(joinResponse.status).toBe(200);

    const attendanceResponse = await request(app)
      .post(`/api/sessions/${sessionId}/attendance`)
      .set("Authorization", `Bearer ${hostLogin.body.token}`)
      .send({
        participantId: attendee.body.user.id,
        attended: true,
      });

    expect(attendanceResponse.status).toBe(200);
    expect(attendanceResponse.body.attendance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user: attendee.body.user.id, present: true }),
      ])
    );

    const rewardClaimResponse = await request(app)
      .post(`/api/rewards/session/${sessionId}/claim`)
      .set("Authorization", `Bearer ${hostLogin.body.token}`);

    expect(rewardClaimResponse.status).toBe(404);

    const attendeeProfile = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${attendeeLogin.body.token}`);

    expect(attendeeProfile.body.user).not.toHaveProperty("meritPoints");
  });
});
