import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
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
    },
  },
  { timestamps: true }
);

budgetSchema.index({ category: 1, month: 1 }, { unique: true });

export const Budget = mongoose.model("Budget", budgetSchema);

