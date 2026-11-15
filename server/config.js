const DEFAULT_LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function parseOrigins(originValue) {
  if (!originValue) {
    return DEFAULT_LOCAL_ORIGINS;
  }

  return originValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins() {
  const envMode = (process.env.NODE_ENV || "development").toLowerCase();
  const configuredOrigins = process.env.CLIENT_ORIGIN || "";

  if (envMode === "production") {
    return parseOrigins(configuredOrigins || process.env.APP_URL || DEFAULT_LOCAL_ORIGINS[0]);
  }

  return parseOrigins(configuredOrigins || DEFAULT_LOCAL_ORIGINS.join(","));
}

function getServerConfig() {
  const envMode = (process.env.NODE_ENV || "development").toLowerCase();
  const isProduction = envMode === "production";

  return {
    isProduction,
    port: Number(process.env.PORT || (isProduction ? 8080 : 5000)),
    appUrl: process.env.APP_URL || (isProduction ? "https://campusarena.app" : "http://localhost:5173"),
    allowedOrigins: resolveAllowedOrigins(),
  };
}

module.exports = {
  DEFAULT_LOCAL_ORIGINS,
  parseOrigins,
  resolveAllowedOrigins,
  getServerConfig,
};
