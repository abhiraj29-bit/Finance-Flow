import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
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
    name: "Charlie",
    email: "charlie@example.com",
    password: "password123",
  });
  token = regRes.body.token;
  user = regRes.body.user;
});

test("Transactions: Create transaction successfully", async () => {
  const app = getTestApp();
  const res = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: 150.75,
      category: "Groceries",
      note: "Weekly market run",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.kind, "expense");
  assert.equal(res.body.amount, 150.75);
  assert.equal(res.body.category, "Groceries");
  assert.equal(res.body.userId, user.id);
});

test("Transactions: Reject transaction creation with invalid amount", async () => {
  const app = getTestApp();
  const res = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: -50,
      category: "Groceries",
    });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /validation error/i);
});

test("Transactions: Retrieve own transactions with pagination metadata", async () => {
  const app = getTestApp();

  // Insert 3 transactions
  for (let i = 1; i <= 3; i++) {
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: i % 2 === 0 ? "income" : "expense",
        amount: i * 100,
        category: i % 2 === 0 ? "Salary" : "Dining",
      });
  }

  const res = await request(app)
    .get("/api/transactions?page=1&limit=2")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.pagination.page, 1);
  assert.equal(res.body.pagination.limit, 2);
  assert.equal(res.body.pagination.totalRecords, 3);
  assert.equal(res.body.pagination.totalPages, 2);
});

test("Transactions: Filter transactions by kind and category", async () => {
  const app = getTestApp();

  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 50, category: "Dining" });

  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 120, category: "Books" });

  await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "income", amount: 3000, category: "Salary" });

  const filterRes = await request(app)
    .get("/api/transactions?kind=expense&category=Dining")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(filterRes.status, 200);
  assert.equal(filterRes.body.data.length, 1);
  assert.equal(filterRes.body.data[0].category, "Dining");
});

test("Transactions: Update existing transaction (PUT)", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 40, category: "Coffee" });

  const txId = createRes.body._id;

  const updateRes = await request(app)
    .put(`/api/transactions/${txId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      kind: "expense",
      amount: 45.5,
      category: "Coffee & Pastries",
      note: "Updated note",
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.amount, 45.5);
  assert.equal(updateRes.body.category, "Coffee & Pastries");
  assert.equal(updateRes.body.note, "Updated note");
});

test("Transactions: Partially update existing transaction (PATCH)", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 100, category: "Fuel" });

  const txId = createRes.body._id;

  const patchRes = await request(app)
    .patch(`/api/transactions/${txId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 115 });

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.amount, 115);
  assert.equal(patchRes.body.category, "Fuel");
});

test("Transactions: Delete own transaction (DELETE)", async () => {
  const app = getTestApp();

  const createRes = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 30, category: "Snacks" });

  const txId = createRes.body._id;

  const deleteRes = await request(app)
    .delete(`/api/transactions/${txId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.id, txId);

  // Verify it is gone
  const listRes = await request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(listRes.body.data.length, 0);
});

test("Transactions: Return 404 for non-existent transaction update or delete", async () => {
  const app = getTestApp();
  const fakeId = "609c1f6b8f1b2c0015b6d912";

  const putRes = await request(app)
    .put(`/api/transactions/${fakeId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ kind: "expense", amount: 50, category: "Misc" });

  assert.equal(putRes.status, 404);

  const delRes = await request(app)
    .delete(`/api/transactions/${fakeId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(delRes.status, 404);
});
