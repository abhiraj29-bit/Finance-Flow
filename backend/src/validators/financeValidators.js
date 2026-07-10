import { z } from "zod";

export const transactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(2),
  date: z.string().datetime().optional(),
  note: z.string().max(160).optional(),
});

export const budgetSchema = z.object({
  category: z.string().min(2),
  monthlyLimit: z.number().nonnegative(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const goalSchema = z.object({
  name: z.string().min(2),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime(),
  color: z.string().optional(),
});

export const goalAllocationSchema = z.object({
  amount: z.number().positive(),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
