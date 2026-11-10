import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const rawJwtSecret = process.env.JWT_SECRET?.trim();
const fallbackSecret = "financeflow_dev_secret_key";

if (isProduction && (!rawJwtSecret || rawJwtSecret === fallbackSecret)) {
  console.warn("SECURITY WARNING: JWT_SECRET must be set to a strong unique secret in production!");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5004,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/financeflow",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: rawJwtSecret || fallbackSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
