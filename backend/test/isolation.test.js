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
let user1Id;
let user2Id;

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
  user1Id = reg1.body.user.id;

  const reg2 = await request(app).post("/api/auth/register").send({
    name: "User Two",
    email: "user2@example.com",
    password: "password123",
  });
  user2Token = reg2.body.token;
  user2Id = reg2.body.user.id;
});

test("Isolation: User cannot read another user's transactions", async () => {
  const app = getTestApp();

  // User 1 creates a transaction
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "income", amount: 5000, category: "User1 Salary" });

  // User 2 creates a transaction
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ kind: "expense", amount: 200, category: "User2 Groceries" });

  // User 1 fetches transactions
  const res1 = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(res1.body.data.length, 1);
  assert.equal(res1.body.data[0].category, "User1 Salary");

  // User 2 fetches transactions
  const res2 = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`);
  assert.equal(res2.body.data.length, 1);
  assert.equal(res2.body.data[0].category, "User2 Groceries");
});

test("Isolation: User cannot update or delete another user's transaction", async () => {
  const app = getTestApp();

  // User 2 creates a transaction
  const createRes = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ kind: "expense", amount: 150, category: "User2 Secret" });
  const txId = createRes.body._id;

  // User 1 attempts to update User 2's transaction
  const putRes = await request(app)
    .put(`/api/transactions/${txId}`)
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "expense", amount: 999, category: "Hacked" });
  assert.equal(putRes.status, 404);

  // User 1 attempts to delete User 2's transaction
  const delRes = await request(app)
    .delete(`/api/transactions/${txId}`)
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(delRes.status, 404);

  // Verify User 2's transaction is untouched
  const checkRes = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`);
  assert.equal(checkRes.body.data[0].amount, 150);
  assert.equal(checkRes.body.data[0].category, "User2 Secret");
});

test("Isolation: Budgets are strictly isolated and do not collide", async () => {
  const app = getTestApp();

  // User 1 sets budget for Groceries in 2026-11
  await request(app)
    .post("/api/budgets")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ category: "Groceries", monthlyLimit: 500, month: "2026-11" });

  // User 2 sets budget for same category and month without collision
  const b2Res = await request(app)
    .post("/api/budgets")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ category: "Groceries", monthlyLimit: 800, month: "2026-11" });
  assert.equal(b2Res.status, 201);
  assert.equal(b2Res.body.monthlyLimit, 800);

  // User 1 lists budgets: sees 500, not 800
  const list1 = await request(app)
    .get("/api/budgets")
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(list1.body.length, 1);
  assert.equal(list1.body[0].monthlyLimit, 500);

  // User 2 lists budgets: sees 800, not 500
  const list2 = await request(app)
    .get("/api/budgets")
    .set("Authorization", `Bearer ${user2Token}`);
  assert.equal(list2.body.length, 1);
  assert.equal(list2.body[0].monthlyLimit, 800);

  // Summary with specific month parameter
  const summaryRes = await request(app)
    .get("/api/summary?month=2026-11")
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.body.budgetMonth, "2026-11");
  assert.equal(summaryRes.body.budgetProgress.length, 1);
  assert.equal(summaryRes.body.budgetProgress[0].category, "Groceries");

  // User 1 cannot delete User 2's budget
  const delForbidden = await request(app)
    .delete(`/api/budgets/${b2Res.body._id}`)
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(delForbidden.status, 404);

  // User 2 can delete own budget
  const delSuccess = await request(app)
    .delete(`/api/budgets/${b2Res.body._id}`)
    .set("Authorization", `Bearer ${user2Token}`);
  assert.equal(delSuccess.status, 200);
});

test("Isolation: Goals and allocations are isolated across users", async () => {
  const app = getTestApp();

  // User 2 creates a goal
  const g2Res = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({
      name: "User2 Vacation",
      targetAmount: 2000,
      targetDate: "2026-12-31T00:00:00.000Z",
    });
  const goalId = g2Res.body._id;

  // User 1 cannot view User 2's goal
  const gList1 = await request(app)
    .get("/api/goals")
    .set("Authorization", `Bearer ${user1Token}`);
  assert.equal(gList1.body.length, 0);

  // User 1 cannot allocate to User 2's goal
  const allocRes = await request(app)
    .post(`/api/goals/${goalId}/allocate`)
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ amount: 100 });
  assert.equal(allocRes.status, 404);
});

test("Isolation: Dashboard summary analytics are strictly user-scoped", async () => {
  const app = getTestApp();

  // User 1: 10,000 income, 2,000 expense
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "income", amount: 10000, category: "Salary" });
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ kind: "expense", amount: 2000, category: "Rent" });

  // User 2: 50,000 income, 10,000 expense
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ kind: "income", amount: 50000, category: "Business" });
  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ kind: "expense", amount: 10000, category: "Supplies" });

  // User 1's summary should only show User 1's numbers
  const sum1 = await request(app)
    .get("/api/summary")
    .set("Authorization", `Bearer ${user1Token}`);

  assert.equal(sum1.status, 200);
  assert.equal(sum1.body.totals.income, 10000);
  assert.equal(sum1.body.totals.expense, 2000);
  assert.equal(sum1.body.totals.balance, 8000);

  // User 2's summary should only show User 2's numbers
  const sum2 = await request(app)
    .get("/api/summary")
    .set("Authorization", `Bearer ${user2Token}`);

  assert.equal(sum2.status, 200);
  assert.equal(sum2.body.totals.income, 50000);
  assert.equal(sum2.body.totals.expense, 10000);
  assert.equal(sum2.body.totals.balance, 40000);
});
