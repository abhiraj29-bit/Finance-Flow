import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    color: {
      type: String,
      default: "#0f766e",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, targetDate: 1 });
goalSchema.index({ userId: 1, isCompleted: 1 });

export const Goal = mongoose.model("Goal", goalSchema);
