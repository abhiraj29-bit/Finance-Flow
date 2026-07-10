import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    const err = new Error("Not authenticated");
    err.statusCode = 401;
    return next(err);
  }

  const token = header.split(" ")[1];

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    return next(err);
  }

  const user = await User.findById(payload.sub).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    return next(err);
  }

  req.user = user;
  next();
}
