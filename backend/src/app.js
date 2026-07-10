import cors from "cors";
import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

export function createApp({ clientUrl }) {
  const app = express();

  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/", (_req, res) => {
    res.json({ message: "FinanceFlow API is running" });
  });

  // Public routes
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);

  // Protected routes — require valid JWT
  app.use("/api/transactions", protect, transactionRoutes);
  app.use("/api/budgets", protect, budgetRoutes);
  app.use("/api/goals", protect, goalRoutes);
  app.use("/api/summary", protect, summaryRoutes);

  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Internal server error",
    });
  });

  return app;
}
