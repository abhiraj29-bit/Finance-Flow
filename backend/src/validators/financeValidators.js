import { z } from "zod";

export const transactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(2),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
    .optional(),
  note: z.string().max(160).optional(),
});

export const transactionUpdateSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(2),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
    .optional(),
  note: z.string().max(160).optional(),
});

export const transactionPatchSchema = z.object({
  kind: z.enum(["income", "expense"]).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(2).optional(),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
    .optional(),
  note: z.string().max(160).optional(),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().trim().optional(),
  kind: z.enum(["income", "expense"]).optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid startDate" })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid endDate" })
    .optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  source: z.string().trim().optional(),
  sortBy: z.enum(["date", "amount", "category", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const budgetSchema = z.object({
  category: z.string().trim().min(2),
  monthlyLimit: z.number().nonnegative(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const goalSchema = z.object({
  name: z.string().min(2),
  targetAmount: z.number().positive(),
  targetDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid targetDate" }),
  color: z.string().optional(),
});

export const goalUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().nonnegative().optional(),
  targetDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid targetDate" })
    .optional(),
  color: z.string().optional(),
});

export const goalAllocationSchema = z.object({
  amount: z.number().positive(),
});

export const recurringTransactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(2),
  kind: z.enum(["income", "expense"]),
  description: z.string().max(160).optional().default(""),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid startDate" }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid endDate" })
    .optional()
    .nullable(),
});

export const recurringTransactionPatchSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(2).optional(),
  description: z.string().max(160).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  isActive: z.boolean().optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid endDate" })
    .optional()
    .nullable(),
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
