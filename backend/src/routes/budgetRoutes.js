import { Router } from "express";
import { deleteBudget, listBudgets, upsertBudget } from "../controllers/budgetController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listBudgets));
router.post("/", asyncHandler(upsertBudget));
router.delete("/:id", asyncHandler(deleteBudget));

export default router;

