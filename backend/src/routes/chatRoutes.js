import { Router } from "express";
import { handleChatQuery } from "../controllers/chatController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/", asyncHandler(handleChatQuery));

export default router;
