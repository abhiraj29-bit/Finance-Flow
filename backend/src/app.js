import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimiter.js";

export function createApp({ clientUrl } = {}) {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  const isDev = process.env.NODE_ENV !== "production";

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (clientUrl && origin === clientUrl) return callback(null, true);
        if (
          isDev &&
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(
            origin
          )
        ) {
          return callback(null, true);
        }
        if (isDev) return callback(null, true);
        return callback(new Error("Blocked by CORS policy"));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
    app.use("/api", apiRateLimiter);
  }

  app.get("/", (_req, res) => {
    res.json({ message: "FinanceFlow API is running" });
  });

  // Public routes
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRateLimiter, authRoutes);

  // Protected routes — require valid JWT
  app.use("/api/transactions", protect, transactionRoutes);
  app.use("/api/budgets", protect, budgetRoutes);
  app.use("/api/goals", protect, goalRoutes);
  app.use("/api/recurring-transactions", protect, recurringRoutes);
  app.use("/api/summary", protect, summaryRoutes);
  app.use("/api/chat", protect, chatRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
