module.exports = {
  UNPAID_EXPIRY_HOURS: Number(process.env.UNPAID_EXPIRY_HOURS || 1),
  SESSION_SECRET: process.env.SESSION_SECRET || "prego-session-secret",
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || "0.0.0.0",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
};
