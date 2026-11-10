import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    monthlyLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1 });

export const Budget = mongoose.model("Budget", budgetSchema);
