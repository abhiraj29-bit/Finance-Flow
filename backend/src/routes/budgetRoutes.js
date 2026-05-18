import { Router } from "express";
import { listBudgets, upsertBudget } from "../controllers/budgetController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listBudgets));
router.post("/", asyncHandler(upsertBudget));

export default router;

