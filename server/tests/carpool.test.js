process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");

describe("CampusArena carpool flow", () => {
  beforeAll(async () => {
    const mongoUri = new URL(process.env.MONGO_URI || "mongodb://localhost:27017/campusarena_test");
    mongoUri.pathname = "/campusarena_carpool_test";
    await mongoose.connect(mongoUri.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it("creates a from-uni carpool and allows a request to join", async () => {
    const driver = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Driver One",
        email: "driver1@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
        gender: "Female",
      });

    const rider = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Rider One",
        email: "rider1@nu.edu.pk",
        password: "securepass123",
        confirmPassword: "securepass123",
        university: "FAST Islamabad",
        gender: "Female",
      });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: driver.body.verificationToken });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: rider.body.verificationToken });

    const driverLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "driver1@nu.edu.pk", password: "securepass123" });

    const riderLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "rider1@nu.edu.pk", password: "securepass123" });

    const createResponse = await request(app)
      .post("/api/carpools")
      .set("Authorization", `Bearer ${driverLogin.body.token}`)
      .send({
        journeyType: "From Uni",
        startingLocation: "Main Gate",
        destination: "G-11 Market",
        stops: ["Library", "Cafeteria"],
        journeyDate: "2026-11-15",
        departureTime: "18:30",
        transportType: "Car",
        seatsAvailable: 2,
        fareType: "Set Fare",
        fareAmount: 200,
        passengerPreference: "Girls Only",
        notes: "Pickup near gate 3.",
      });

    expect(createResponse.status).toBe(201);

    const requestResponse = await request(app)
      .post(`/api/carpools/${createResponse.body._id}/request`)
      .set("Authorization", `Bearer ${riderLogin.body.token}`);

    expect(requestResponse.status).toBe(200);

    const listResponse = await request(app)
      .get("/api/carpools?journeyType=From%20Uni");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBeGreaterThanOrEqual(1);
  });
});
