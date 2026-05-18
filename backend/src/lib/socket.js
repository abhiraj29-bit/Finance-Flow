import { Server } from "socket.io";

let io;

export function initSocket(server, options = {}) {
  io = new Server(server, {
    cors: {
      origin: options.clientUrl,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.emit("finance:connected", { ok: true });
  });

  return io;
}

export function emitFinanceUpdate(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

