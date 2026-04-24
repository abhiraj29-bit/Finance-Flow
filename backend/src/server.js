import http from "http";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocket } from "./lib/socket.js";

async function bootstrap() {
  await connectDatabase(env.mongoUri);

  const app = createApp({ clientUrl: env.clientUrl });
  const server = http.createServer(app);

  initSocket(server, { clientUrl: env.clientUrl });

  server.listen(env.port, () => {
    console.log(`FinanceFlow backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start FinanceFlow backend", error);
  process.exit(1);
});

