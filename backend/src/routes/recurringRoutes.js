import { Router } from "express";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  listRecurringTransactions,
  patchRecurringTransaction,
} from "../controllers/recurringController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listRecurringTransactions));
router.post("/", asyncHandler(createRecurringTransaction));
router.patch("/:id", asyncHandler(patchRecurringTransaction));
router.delete("/:id", asyncHandler(deleteRecurringTransaction));

export default router;
