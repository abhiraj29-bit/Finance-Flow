import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  clearDatabase,
  getTestApp,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup.js";

let user1Token;
let user2Token;
let user1;
let user2;

before(async () => {
  await setupTestEnvironment();
});

after(async () => {
  await teardownTestEnvironment();
});

beforeEach(async () => {
  await clearDatabase();
  const app = getTestApp();

  const reg1 = await request(app).post("/api/auth/register").send({
    name: "User One",
    email: "user1@example.com",
    password: "password123",
  });
  user1Token = reg1.body.token;
  user1 = reg1.body.user;

  const reg2 = await request(app).post("/api/auth/register").send({
    name: "User Two",
    email: "user2@example.com",
    password: "password123",
  });
  user2Token = reg2.body.token;
  user2 = reg2.body.user;
});

test("Chat: Reject unauthenticated chat request", async () => {
  const app = getTestApp();
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "What is my balance?" });

  assert.equal(res.status, 401);
});

test("Chat: Reject empty message payload", async () => {
  const app = getTestApp();
  const res = await request(app)
    .post("/api/chat")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ message: "" });

  assert.equal(res.status, 400);
});

test("Chat: Responds with financial summary and balance", async () => {
  const app = getTestApp();

  // Create income and expense for User 1
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "income", amount: 20000, category: "Salary" });

  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "expense", amount: 5000, category: "Rent" });

  const res = await request(app)
    .post("/api/chat")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ message: "What is my current financial balance and income?" });

  assert.equal(res.status, 200);
  assert.ok(res.body.reply);
  assert.match(res.body.reply, /income/i);
});

test("Chat: Responds with sinking fund goals", async () => {
  const app = getTestApp();

  await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({
      name: "Europe Trip",
      targetAmount: 80000,
      targetDate: "2027-06-01T00:00:00.000Z",
    });

  const res = await request(app)
    .post("/api/chat")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ message: "How are my sinking funds and goals doing?" });

  assert.equal(res.status, 200);
  assert.ok(res.body.reply);
  assert.match(res.body.reply, /Europe Trip/i);
});

test("Chat: Multi-user isolation — Assistant never discloses other users' data", async () => {
  const app = getTestApp();

  // User 2 creates a secret high-value transaction
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ kind: "expense", amount: 999999, category: "SecretProject" });

  // User 1 asks about transactions
  const res = await request(app)
    .post("/api/chat")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ message: "What transactions have I made under SecretProject?" });

  assert.equal(res.status, 200);
  // User 1's response must NOT contain User 2's secret
  assert.doesNotMatch(res.body.reply, /999999/);
});
