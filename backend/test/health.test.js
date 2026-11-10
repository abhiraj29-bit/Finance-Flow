import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

test("health route responds successfully with status ok", async () => {
  const app = createApp({ clientUrl: "http://localhost:5173" });
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});
