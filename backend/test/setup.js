import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Transaction } from "../src/models/Transaction.js";
import { Budget } from "../src/models/Budget.js";
import { Goal } from "../src/models/Goal.js";
import { RecurringTransaction } from "../src/models/RecurringTransaction.js";

let replSet;
let app;

export async function setupTestEnvironment() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
  process.env.JWT_EXPIRES_IN = "1d";

  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const uri = replSet.getUri();
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Pre-create collections and build indexes so multi-document transactions never hit catalog change errors
  await Promise.all([
    User.createCollection().catch(() => {}),
    Transaction.createCollection().catch(() => {}),
    Budget.createCollection().catch(() => {}),
    Goal.createCollection().catch(() => {}),
    RecurringTransaction.createCollection().catch(() => {}),
  ]);

  await Promise.all([
    User.init().catch(() => {}),
    Transaction.init().catch(() => {}),
    Budget.init().catch(() => {}),
    Goal.init().catch(() => {}),
    RecurringTransaction.init().catch(() => {}),
  ]);

  app = createApp({ clientUrl: "http://localhost:5173" });

  return { app, uri };
}

export async function clearDatabase() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
}

export async function teardownTestEnvironment() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
}

export function getTestApp() {
  return app;
}
