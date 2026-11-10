import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  clearDatabase,
  getTestApp,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup.js";

before(async () => {
  await setupTestEnvironment();
});

after(async () => {
  await teardownTestEnvironment();
});

beforeEach(async () => {
  await clearDatabase();
});

test("Auth: Successful user registration", async () => {
  const app = getTestApp();
  const res = await request(app).post("/api/auth/register").send({
    name: "Alice Johnson",
    email: "alice@example.com",
    password: "securePassword123",
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, "Alice Johnson");
  assert.equal(res.body.user.email, "alice@example.com");
  assert.equal(res.body.user.password, undefined); // Password must not be returned
});

test("Auth: Reject registration with duplicate email", async () => {
  const app = getTestApp();
  await request(app).post("/api/auth/register").send({
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
  });

  const res = await request(app).post("/api/auth/register").send({
    name: "Alice 2",
    email: "alice@example.com",
    password: "password456",
  });

  assert.equal(res.status, 409);
  assert.match(res.body.message, /already in use/i);
});

test("Auth: Successful login with valid credentials", async () => {
  const app = getTestApp();
  await request(app).post("/api/auth/register").send({
    name: "Bob Builder",
    email: "bob@example.com",
    password: "correctPassword",
  });

  const res = await request(app).post("/api/auth/login").send({
    email: "bob@example.com",
    password: "correctPassword",
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, "bob@example.com");
});

test("Auth: Reject login with invalid password", async () => {
  const app = getTestApp();
  await request(app).post("/api/auth/register").send({
    name: "Bob Builder",
    email: "bob@example.com",
    password: "correctPassword",
  });

  const res = await request(app).post("/api/auth/login").send({
    email: "bob@example.com",
    password: "wrongPassword",
  });

  assert.equal(res.status, 401);
  assert.match(res.body.message, /invalid email or password/i);
});

test("Auth: Reject protected route when token is missing", async () => {
  const app = getTestApp();
  const res = await request(app).get("/api/auth/me");

  assert.equal(res.status, 401);
  assert.match(res.body.message, /not authenticated/i);
});

test("Auth: Reject protected route when token is invalid or malformed", async () => {
  const app = getTestApp();
  const res = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer invalid.jwt.token");

  assert.equal(res.status, 401);
  assert.match(res.body.message, /invalid or expired/i);
});
