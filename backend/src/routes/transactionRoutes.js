import { Router } from "express";
import { createTransaction, listTransactions } from "../controllers/transactionController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listTransactions));
router.post("/", asyncHandler(createTransaction));

export default router;

