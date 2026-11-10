import { Router } from "express";
import {
  allocateToGoal,
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
  withdrawFromGoal,
} from "../controllers/goalController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listGoals));
router.post("/", asyncHandler(createGoal));
router.post("/:id/allocate", asyncHandler(allocateToGoal));
router.post("/:id/withdraw", asyncHandler(withdrawFromGoal));
router.put("/:id", asyncHandler(updateGoal));
router.patch("/:id", asyncHandler(updateGoal));
router.delete("/:id", asyncHandler(deleteGoal));

export default router;
