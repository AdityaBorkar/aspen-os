import { calendarReminder } from "#/db-schemas";
import { REMINDER_CHANNEL, REMINDER_TARGET, REMINDER_TYPE } from "#/utils/constants";

import type { InferSchemaOutput, PubSubUnit, StandardSchema } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { array, boolean, nullable, object, optional, string } from "valibot";

export interface TaskBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

export interface TaskBridgeOptions {
  enabled?: boolean;
}

const TaskDueDateChangedEventSchema = object({
  dueDate: nullable(string()),
  taskId: string(),
  userIds: array(string()),
});

const TaskDeletedEventSchema = object({
  taskId: string(),
});

const TaskStatusChangedEventSchema = object({
  fromStatus: string(),
  isTerminal: optional(boolean()),
  task: object({
    id: string(),
    title: string(),
  }),
  toStatus: string(),
  toStatusCategory: optional(string()),
});

/** Mirrors tasks `STATUS_CATEGORY` terminal values (`completed`, `cancelled`). */
const TERMINAL_TASK_STATUS_CATEGORIES: ReadonlySet<string> = new Set(["cancelled", "completed"]);

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DUE_DATE_OFFSETS_MS = [DAY_MS, HOUR_MS, 0];

async function deletePendingTaskReminders(db: PostgresJsDatabase, taskId: string): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.target_type, REMINDER_TARGET.TASK),
        eq(calendarReminder.target_id, taskId),
        eq(calendarReminder.is_sent, false),
      ),
    );
}

async function handleDueDateChanged(
  event: { dueDate: string | null; taskId: string; userIds: string[] },
  { db }: TaskBridgeDeps,
): Promise<void> {
  const userIds = [...new Set(event.userIds)];
  const dueDate = event.dueDate ? new Date(event.dueDate) : null;

  if (!dueDate || Number.isNaN(dueDate.getTime()) || userIds.length === 0) {
    await deletePendingTaskReminders(db, event.taskId);
    return;
  }

  const rows = userIds.flatMap((userId) =>
    DUE_DATE_OFFSETS_MS.map((offset) => ({
      channel: REMINDER_CHANNEL.PUBSUB,
      created_by: "task-bridge",
      remind_at: new Date(dueDate.getTime() - offset),
      target_id: event.taskId,
      target_type: REMINDER_TARGET.TASK,
      type: REMINDER_TYPE.DUE_DATE,
      user_id: userId,
    })),
  );

  await db.transaction(async (tx) => {
    await deletePendingTaskReminders(tx, event.taskId);
    await tx.insert(calendarReminder).values(rows);
  });
}

async function handleTaskDeleted(event: { taskId: string }, { db }: TaskBridgeDeps): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.target_type, REMINDER_TARGET.TASK),
        eq(calendarReminder.target_id, event.taskId),
      ),
    );
}

async function handleTaskStatusChanged(
  event: {
    isTerminal?: boolean;
    task: { id: string };
    toStatus: string;
    toStatusCategory?: string;
  },
  { db }: TaskBridgeDeps,
): Promise<void> {
  // Preferred path: terminality travels in the event — no cross-module read.
  if (event.isTerminal !== undefined) {
    if (event.isTerminal) {
      await deletePendingTaskReminders(db, event.task.id);
    }
    return;
  }
  if (event.toStatusCategory !== undefined) {
    if (TERMINAL_TASK_STATUS_CATEGORIES.has(event.toStatusCategory)) {
      await deletePendingTaskReminders(db, event.task.id);
    }
    return;
  }

  // Compatibility fallback for publishers that predate the terminal fields.
  // Tasks owns the `task_status` table; a missing table means tasks is not
  // installed here, so there is nothing to clean up.
  try {
    const [row] = await db.execute<{ category: string | null }>(
      sql`SELECT category FROM "task_status" WHERE id = ${event.toStatus}`,
    );
    if (row && TERMINAL_TASK_STATUS_CATEGORIES.has(row.category ?? "")) {
      await deletePendingTaskReminders(db, event.task.id);
    }
  } catch {
    // Tasks tables absent — nothing to clean up
  }
}

export async function registerTaskBridge(
  deps: TaskBridgeDeps,
  options?: TaskBridgeOptions,
): Promise<string[]> {
  if (options?.enabled === false) {
    return [];
  }

  async function subscribe<TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>) => Promise<void>,
  ): Promise<void> {
    await deps.pubsub.subscribe(topic, async (message) => {
      const result = await schema["~standard"].validate(message.data);
      if (!result.issues) {
        await handler(result.value);
      }
    });
  }

  await subscribe("task:due_date_changed", TaskDueDateChangedEventSchema, (data) =>
    handleDueDateChanged(data, deps),
  );
  await subscribe("task:deleted", TaskDeletedEventSchema, (data) => handleTaskDeleted(data, deps));
  await subscribe("task:status_changed", TaskStatusChangedEventSchema, (data) =>
    handleTaskStatusChanged(data, deps),
  );

  return ["task:due_date_changed", "task:deleted", "task:status_changed"];
}

export async function unregisterTaskBridge(
  topics: string[],
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await pubsub.unsubscribe(topic);
      } catch {
        // Best-effort cleanup
      }
    }),
  );
}
