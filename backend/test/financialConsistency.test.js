import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Goal } from "../src/models/Goal.js";
import { Transaction } from "../src/models/Transaction.js";
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
    name: "Diana Prince",
    email: "diana@example.com",
    password: "password123",
  });
  token = regRes.body.token;
  user = regRes.body.user;
});

test("Financial Consistency: Goal allocation updates both goal and creates ledger entry atomically", async () => {
  const app = getTestApp();

  // Create a goal of 1000
  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Emergency Fund",
      targetAmount: 1000,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  // Allocate 250
  const allocRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 250 });

  assert.equal(allocRes.status, 200);
  assert.equal(allocRes.body.currentAmount, 250);
  assert.equal(allocRes.body.isCompleted, false);

  // Verify matching transaction exists in ledger
  const txList = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(txList.body.data.length, 1);
  const ledgerTx = txList.body.data[0];
  assert.equal(ledgerTx.kind, "income");
  assert.equal(ledgerTx.amount, 250);
  assert.equal(ledgerTx.source, "goal-allocation");
  assert.equal(ledgerTx.goalId, goalId);
});

test("Financial Consistency: Reject allocation exceeding remaining goal amount", async () => {
  const app = getTestApp();

  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Short Trip",
      targetAmount: 500,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  // Attempt to allocate 600 (exceeds target of 500)
  const allocRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 600 });

  assert.equal(allocRes.status, 400);
  assert.match(allocRes.body.message, /exceeds remaining/i);

  // Verify goal amount remains 0
  const goal = await Goal.findById(goalId);
  assert.equal(goal.currentAmount, 0);

  // Verify no ledger transaction was created
  const txCount = await Transaction.countDocuments({ goalId });
  assert.equal(txCount, 0);
});

test("Financial Consistency: Reject negative or zero allocation amounts", async () => {
  const app = getTestApp();

  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "New Phone",
      targetAmount: 800,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  const negRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: -50 });
  assert.equal(negRes.status, 400);

  const zeroRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 0 });
  assert.equal(zeroRes.status, 400);
});

test("Financial Consistency: Goal marked completed upon reaching target", async () => {
  const app = getTestApp();

  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Bicycle",
      targetAmount: 300,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  // Allocate exact target amount
  const allocRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 300 });

  assert.equal(allocRes.status, 200);
  assert.equal(allocRes.body.currentAmount, 300);
  assert.equal(allocRes.body.isCompleted, true);

  // Attempting further allocation should be rejected as already fully funded
  const extraRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 10 });
  assert.equal(extraRes.status, 400);
  assert.match(extraRes.body.message, /already fully funded/i);
});

test("Financial Consistency: Duplicate allocation prevention with idempotency key", async () => {
  const app = getTestApp();

  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Laptop Fund",
      targetAmount: 2000,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  const idempotencyKey = "unique-alloc-key-12345";

  // First allocation with idempotency key
  const alloc1 = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", idempotencyKey)
    .send({ amount: 500 });
  assert.equal(alloc1.status, 200);
  assert.equal(alloc1.body.currentAmount, 500);

  // Duplicate request with the identical idempotency key is aborted cleanly by unique constraint
  const alloc2 = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .set("Idempotency-Key", idempotencyKey)
    .send({ amount: 500 });

  // Conflict / duplicate detected
  assert.equal(alloc2.status, 409);

  // Verify goal currentAmount rolled back and remained 500, not 1000
  const finalGoal = await Goal.findById(goalId);
  assert.equal(finalGoal.currentAmount, 500);

  // Verify only 1 transaction exists in database
  const txCount = await Transaction.countDocuments({ idempotencyKey });
  assert.equal(txCount, 1);
});

test("Financial Consistency: Multiple goal deposits and withdrawals preserve full transaction audit history", async () => {
  const app = getTestApp();

  // Create a goal of 5000
  const goalRes = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Trip Fund",
      targetAmount: 5000,
      targetDate: "2027-01-31T00:00:00.000Z",
    });
  const goalId = goalRes.body._id;

  // Deposit 1300
  const alloc1 = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 1300 });
  assert.equal(alloc1.status, 200);
  assert.equal(alloc1.body.currentAmount, 1300);

  // Deposit 600
  const alloc2 = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 600 });
  assert.equal(alloc2.status, 200);
  assert.equal(alloc2.body.currentAmount, 1900);

  // Withdraw 300
  const withdrawRes = await request(app)
    .post(`/api/goals/${goalId}/withdraw`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 300 });
  assert.equal(withdrawRes.status, 200);
  assert.equal(withdrawRes.body.currentAmount, 1600);

  // Verify all 3 separate transactions are preserved in history (none overwritten or deleted)
  const txList = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(txList.body.data.length, 3);

  // Chronological transactions exist:
  const amounts = txList.body.data.map((t) => ({ kind: t.kind, amount: t.amount }));
  assert.deepEqual(
    amounts.sort((a, b) => a.amount - b.amount),
    [
      { kind: "expense", amount: 300 }, // Withdrawal
      { kind: "income", amount: 600 },  // Deposit 2
      { kind: "income", amount: 1300 }, // Deposit 1
    ]
  );

  // Verify sinking fund metrics are separated from general cash transactions:
  // Sinking Funds: Deposits = 1900, Withdrawals = 300, Locked/Saved = 1600
  // General Transactions: Income = 0, Expense = 0 (completely separate!)
  const summaryRes = await request(app)
    .get("/api/summary")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(summaryRes.body.totals.sinkingFunds.deposits, 1900);
  assert.equal(summaryRes.body.totals.sinkingFunds.withdrawals, 300);
  assert.equal(summaryRes.body.totals.sinkingFunds.totalSaved, 1600);
  assert.equal(summaryRes.body.totals.lockedInGoals, 1600);
  assert.equal(summaryRes.body.totals.income, 0);
  assert.equal(summaryRes.body.totals.expense, 0);
});
