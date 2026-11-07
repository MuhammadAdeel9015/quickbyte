require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : "quickbite-local-development-secret-change-me");
const storageProvider = process.env.DATA_PROVIDER || "memory";

if (!["memory", "supabase"].includes(storageProvider)) {
  throw new Error("DATA_PROVIDER must be either memory or supabase.");
}

if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
}

module.exports = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "4000", 10),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  storageProvider,
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
});
