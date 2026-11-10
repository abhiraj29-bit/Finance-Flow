import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    kind: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

recurringTransactionSchema.index({ userId: 1, isActive: 1 });
recurringTransactionSchema.index({ isActive: 1, nextDueDate: 1 });

export const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema
);
