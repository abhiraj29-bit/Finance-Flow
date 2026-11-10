import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { RecurringTransaction } from "../src/models/RecurringTransaction.js";
import { Transaction } from "../src/models/Transaction.js";
import {
  calculateNextDueDate,
  processDueRecurringTransactions,
} from "../src/services/recurringScheduler.js";
import {
  clearDatabase,
  getTestApp,
  setupTestEnvironment,
  teardownTestEnvironment,
} from "./setup.js";

let token;
let user;

before(async () => {
  await setupTestEnvironment();
});

after(async () => {
  await teardownTestEnvironment();
});

beforeEach(async () => {
  await clearDatabase();
  const app = getTestApp();

  const regRes = await request(app).post("/api/auth/register").send({
    name: "Evan Wright",
    email: "evan@example.com",
    password: "password123",
  });
  token = regRes.body.token;
  user = regRes.body.user;
});

test("Recurring: calculateNextDueDate advances calendar properly", () => {
  const base = new Date("2026-01-15T00:00:00.000Z");

  const daily = calculateNextDueDate(base, "daily");
  assert.equal(daily.toISOString().slice(0, 10), "2026-01-16");

  const weekly = calculateNextDueDate(base, "weekly");
  assert.equal(weekly.toISOString().slice(0, 10), "2026-01-22");

  const monthly = calculateNextDueDate(base, "monthly");
  assert.equal(monthly.toISOString().slice(0, 10), "2026-02-15");

  const yearly = calculateNextDueDate(base, "yearly");
  assert.equal(yearly.toISOString().slice(0, 10), "2027-01-15");
});

test("Recurring: Create and list recurring transaction schedules", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/recurring-transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: 45,
      category: "Internet",
      description: "Monthly fiber broadband",
      frequency: "monthly",
      startDate: "2026-01-01T00:00:00.000Z",
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.amount, 45);
  assert.equal(createRes.body.frequency, "monthly");
  assert.equal(createRes.body.isActive, true);

  const listRes = await request(app)
    .get("/api/recurring-transactions")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.length, 1);
  assert.equal(listRes.body[0].category, "Internet");
});

test("Recurring: Pause and resume schedule via PATCH", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/recurring-transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: 15,
      category: "Streaming",
      frequency: "monthly",
      startDate: "2026-01-01T00:00:00.000Z",
    });

  const schedId = createRes.body._id;

  // Pause
  const pauseRes = await request(app)
    .patch(`/api/recurring-transactions/${schedId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ isActive: false });
  assert.equal(pauseRes.status, 200);
  assert.equal(pauseRes.body.isActive, false);

  // Resume
  const resumeRes = await request(app)
    .patch(`/api/recurring-transactions/${schedId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ isActive: true });
  assert.equal(resumeRes.status, 200);
  assert.equal(resumeRes.body.isActive, true);
});

test("Recurring: Delete recurring schedule", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/recurring-transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: 60,
      category: "Gym",
      frequency: "monthly",
      startDate: "2026-01-01T00:00:00.000Z",
    });

  const schedId = createRes.body._id;

  const delRes = await request(app)
    .delete(`/api/recurring-transactions/${schedId}`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(delRes.status, 200);

  const listRes = await request(app)
    .get("/api/recurring-transactions")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(listRes.body.length, 0);
});

test("Recurring: Automatic idempotent transaction generation and advancement", async () => {
  const app = getTestApp();

  // Create due daily schedule with start date 2 days ago
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const sched = await RecurringTransaction.create({
    userId: user.id,
    amount: 25,
    category: "Coffee Subscription",
    kind: "expense",
    frequency: "daily",
    startDate: twoDaysAgo,
    nextDueDate: twoDaysAgo,
    isActive: true,
  });

  // Run scheduler worker
  const stats1 = await processDueRecurringTransactions();
  assert.ok(stats1.createdTransactions >= 2);

  // Verify transactions generated belong to user
  const txList = await Transaction.find({ recurringScheduleId: sched._id });
  assert.ok(txList.length >= 2);
  for (const tx of txList) {
    assert.equal(tx.userId.toString(), user.id);
    assert.equal(tx.amount, 25);
    assert.equal(tx.source, "recurring");
  }

  // Run scheduler worker a second time immediately — Idempotency check: MUST NOT create duplicates!
  const stats2 = await processDueRecurringTransactions();
  assert.equal(stats2.createdTransactions, 0);

  const txCountAfter = await Transaction.countDocuments({
    recurringScheduleId: sched._id,
  });
  assert.equal(txCountAfter, txList.length);
});

test("Recurring: Do not create future transactions prematurely", async () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future

  await RecurringTransaction.create({
    userId: user.id,
    amount: 100,
    category: "Future Payment",
    kind: "expense",
    frequency: "monthly",
    startDate: futureDate,
    nextDueDate: futureDate,
    isActive: true,
  });

  const stats = await processDueRecurringTransactions();
  assert.equal(stats.createdTransactions, 0);

  const txCount = await Transaction.countDocuments({
    category: "Future Payment",
  });
  assert.equal(txCount, 0);
});
