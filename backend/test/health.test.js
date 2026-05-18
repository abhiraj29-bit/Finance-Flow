import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("health route responds successfully", async () => {
  const app = createApp({ clientUrl: "http://localhost:5173" });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    const address = server.address();
    fetch(`http://127.0.0.1:${address.port}/api/health`)
      .then((response) => response.json())
      .then((data) => {
        assert.equal(data.status, "ok");
        resolve();
      })
      .catch(reject)
      .finally(() => server.close());
  });
});
