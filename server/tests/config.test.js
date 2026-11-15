const { resolveAllowedOrigins, getServerConfig } = require("../config");

describe("backend production config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts a comma-separated production CORS allowlist", () => {
    process.env.NODE_ENV = "production";
    process.env.CLIENT_ORIGIN = "https://campusarena.app,https://admin.campusarena.app";

    expect(resolveAllowedOrigins()).toEqual([
      "https://campusarena.app",
      "https://admin.campusarena.app",
    ]);
  });

  it("falls back to local development origins when not configured", () => {
    process.env.NODE_ENV = "development";
    delete process.env.CLIENT_ORIGIN;

    expect(resolveAllowedOrigins()).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("exposes the app configuration needed for deployments", () => {
    process.env.NODE_ENV = "production";
    process.env.PORT = "8080";
    process.env.APP_URL = "https://campusarena.app";
    process.env.CLIENT_ORIGIN = "https://campusarena.app";

    const config = getServerConfig();

    expect(config.isProduction).toBe(true);
    expect(config.port).toBe(8080);
    expect(config.appUrl).toBe("https://campusarena.app");
    expect(config.allowedOrigins).toContain("https://campusarena.app");
  });
});
