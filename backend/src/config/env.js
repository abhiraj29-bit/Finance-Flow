import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/financeflow",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

