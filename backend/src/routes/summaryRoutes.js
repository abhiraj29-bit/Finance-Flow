import { Router } from "express";
import { getSummary } from "../controllers/summaryController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getSummary));

export default router;

