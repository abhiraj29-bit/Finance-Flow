import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "goal-allocation", "recurring"],
      default: "manual",
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
    recurringScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
      default: null,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1, createdAt: -1 });
transactionSchema.index({ userId: 1, kind: 1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, date: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
