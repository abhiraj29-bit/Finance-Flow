import { z } from "zod";
import { processChatQuery } from "../services/aiChatService.js";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message too long"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function handleChatQuery(req, res) {
  const { message, history } = chatRequestSchema.parse(req.body);

  const result = await processChatQuery(req.user._id, message, history);

  res.json({
    reply: result.reply,
    mode: result.mode,
    timestamp: new Date().toISOString(),
  });
}
