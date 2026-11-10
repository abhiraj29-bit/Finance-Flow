import cron from "node-cron";
import mongoose from "mongoose";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { Transaction } from "../models/Transaction.js";
import { emitFinanceUpdate } from "../lib/socket.js";

/**
 * Calculates the next due date based on recurrence frequency.
 * Preserves the calendar day when possible.
 */
export function calculateNextDueDate(currentDate, frequency) {
  const next = new Date(currentDate);

  switch (frequency) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly": {
      const currentDay = next.getUTCDate();
      next.setUTCMonth(next.getUTCMonth() + 1);
      // If the month rolled over beyond the intended target (e.g. Jan 31 -> Feb 28/29)
      if (next.getUTCDate() < currentDay) {
        next.setUTCDate(0); // Set to last day of previous month
      }
      break;
    }
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported recurrence frequency: ${frequency}`);
  }

  return next;
}

/**
 * Processes all due recurring transactions idempotently.
 * Safe against server restarts, missed schedules, and concurrent executions.
 */
export async function processDueRecurringTransactions(referenceDate = new Date()) {
  const now = new Date(referenceDate);

  // Find active recurring transactions where nextDueDate is on or before now
  const dueSchedules = await RecurringTransaction.find({
    isActive: true,
    nextDueDate: { $lte: now },
  });

  const results = {
    processed: 0,
    createdTransactions: 0,
    completedSchedules: 0,
    errors: [],
  };

  for (const schedule of dueSchedules) {
    try {
      let currentDue = new Date(schedule.nextDueDate);
      let scheduleUpdated = false;

      // Process all missed occurrences up to `now` without generating future transactions
      while (currentDue <= now && schedule.isActive) {
        // If schedule has passed its endDate, mark inactive and break
        if (schedule.endDate && currentDue > new Date(schedule.endDate)) {
          schedule.isActive = false;
          scheduleUpdated = true;
          results.completedSchedules++;
          break;
        }

        const dateKey = currentDue.toISOString().slice(0, 10);
        const idempotencyKey = `recurring-${schedule._id}-${dateKey}`;

        // Attempt transaction creation with database-enforced idempotency key
        try {
          const tx = await Transaction.create({
            userId: schedule.userId,
            kind: schedule.kind,
            amount: schedule.amount,
            category: schedule.category,
            date: currentDue,
            note: schedule.description || `Recurring ${schedule.frequency} ${schedule.category}`,
            source: "recurring",
            recurringScheduleId: schedule._id,
            idempotencyKey,
          });

          results.createdTransactions++;
          emitFinanceUpdate(
            "finance:updated",
            {
              resource: "transaction",
              action: "created",
              id: tx._id,
            },
            schedule.userId
          );
        } catch (txError) {
          // If transaction already exists for this occurrence (E11000 duplicate key), ignore cleanly
          if (txError.code !== 11000) {
            throw txError;
          }
        }

        schedule.lastProcessedAt = new Date();
        const nextDue = calculateNextDueDate(currentDue, schedule.frequency);

        // Check if next occurrence exceeds endDate
        if (schedule.endDate && nextDue > new Date(schedule.endDate)) {
          schedule.isActive = false;
          results.completedSchedules++;
        }

        schedule.nextDueDate = nextDue;
        currentDue = nextDue;
        scheduleUpdated = true;
      }

      if (scheduleUpdated) {
        await schedule.save();
        results.processed++;
      }
    } catch (err) {
      results.errors.push({ scheduleId: schedule._id, message: err.message });
    }
  }

  return results;
}

let cronJob = null;

/**
 * Initializes the recurring transaction cron scheduler.
 * Runs once every hour at minute 0, or custom interval in UTC.
 * Timezone: UTC (documented and consistent across deployments).
 */
export function startRecurringScheduler(scheduleExpression = "0 * * * *") {
  if (cronJob) {
    cronJob.stop();
  }

  console.log(`Starting recurring transaction scheduler with cron: "${scheduleExpression}" (Timezone: UTC)`);

  // Run on startup to catch up any missed occurrences
  processDueRecurringTransactions().catch((err) => {
    console.error("Error executing initial recurring transactions catch-up:", err);
  });

  cronJob = cron.schedule(
    scheduleExpression,
    async () => {
      try {
        const stats = await processDueRecurringTransactions();
        if (stats.createdTransactions > 0) {
          console.log(
            `[RecurringScheduler] Processed ${stats.processed} schedules, generated ${stats.createdTransactions} transactions.`
          );
        }
      } catch (err) {
        console.error("[RecurringScheduler] Error processing schedules:", err);
      }
    },
    {
      timezone: "UTC",
    }
  );

  return cronJob;
}

export function stopRecurringScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}
