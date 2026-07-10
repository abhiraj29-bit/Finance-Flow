import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/financeflow",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "financeflow_dev_secret_key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
