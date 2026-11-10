import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  patchTransaction,
  updateTransaction,
} from "../controllers/transactionController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listTransactions));
router.post("/", asyncHandler(createTransaction));
router.put("/:id", asyncHandler(updateTransaction));
router.patch("/:id", asyncHandler(patchTransaction));
router.delete("/:id", asyncHandler(deleteTransaction));

export default router;
