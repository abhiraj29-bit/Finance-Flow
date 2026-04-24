import { Router } from "express";
import { allocateToGoal, createGoal, listGoals } from "../controllers/goalController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listGoals));
router.post("/", asyncHandler(createGoal));
router.post("/:id/allocate", asyncHandler(allocateToGoal));

export default router;

