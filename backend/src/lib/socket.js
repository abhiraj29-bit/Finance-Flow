import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io;

export function initSocket(server, options = {}) {
  const isDev = process.env.NODE_ENV !== "production";

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (options.clientUrl && origin === options.clientUrl) return callback(null, true);
        if (
          isDev &&
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(
            origin
          )
        ) {
          return callback(null, true);
        }
        if (isDev) return callback(null, true);
        return callback(new Error("Blocked by CORS policy"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret);
        socket.userId = payload.sub;
      } catch {
        // Allow unauthenticated connection or proceed without userId
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on("join", (userId) => {
      if (userId && (!socket.userId || socket.userId === userId)) {
        socket.join(`user:${userId}`);
      }
    });

    socket.emit("finance:connected", { ok: true });
  });

  return io;
}

export function emitFinanceUpdate(event, payload, userId = null) {
  if (!io) return;
  if (userId) {
    io.to(`user:${userId.toString()}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
