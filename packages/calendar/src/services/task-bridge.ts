import { calendarReminder } from "#/db-schemas";
import { REMINDER_TARGET, REMINDER_TYPE } from "#/utils/constants";

import type { InferSchemaOutput, PubSubUnit, StandardSchema } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullable, object, string, array } from "valibot";

export interface TaskBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
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
  task: object({
    id: string(),
    title: string(),
  }),
  toStatus: string(),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DUE_DATE_OFFSETS_MS = [DAY_MS, HOUR_MS, 0];

async function deletePendingTaskReminders(db: PostgresJsDatabase, taskId: string): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.targetType, REMINDER_TARGET.TASK),
        eq(calendarReminder.targetId, taskId),
        eq(calendarReminder.isSent, false),
      ),
    );
}

async function handleDueDateChanged(
  event: { dueDate: string | null; taskId: string; userIds: string[] },
  { db }: TaskBridgeDeps,
): Promise<void> {
  await deletePendingTaskReminders(db, event.taskId);

  if (!event.dueDate) {
    return;
  }

  const dueDate = new Date(event.dueDate);

  await db.insert(calendarReminder).values(
    event.userIds.flatMap((userId) =>
      DUE_DATE_OFFSETS_MS.map((offset) => ({
        channel: "pubsub" as const,
        createdBy: "task-bridge",
        remindAt: new Date(dueDate.getTime() - offset),
        targetId: event.taskId,
        targetType: REMINDER_TARGET.TASK,
        type: REMINDER_TYPE.DUE_DATE,
        userId,
      })),
    ),
  );
}

async function handleTaskDeleted(event: { taskId: string }, { db }: TaskBridgeDeps): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.targetType, REMINDER_TARGET.TASK),
        eq(calendarReminder.targetId, event.taskId),
      ),
    );
}

async function handleTaskStatusChanged(
  event: { task: { id: string }; toStatus: string },
  { db }: TaskBridgeDeps,
): Promise<void> {
  const [row] = await db.execute<{ category: string | null }>(
    sql`SELECT category FROM "status" WHERE id = ${event.toStatus}`,
  );
  if (!row) {
    return;
  }
  if (row.category === "completed" || row.category === "cancelled") {
    await deletePendingTaskReminders(db, event.task.id);
  }
}

export async function registerTaskBridge(deps: TaskBridgeDeps): Promise<string[]> {
  const topics: string[] = [];
  const subscribe = subscribeSafe(deps);

  await subscribe("task:due_date_changed", TaskDueDateChangedEventSchema, (data) =>
    handleDueDateChanged(data, deps),
  );
  topics.push("task:due_date_changed");

  await subscribe("task:deleted", TaskDeletedEventSchema, (data) => handleTaskDeleted(data, deps));
  topics.push("task:deleted");

  await subscribe("task:status_changed", TaskStatusChangedEventSchema, (data) =>
    handleTaskStatusChanged(data, deps),
  );
  topics.push("task:status_changed");

  return topics;
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
        // Ignore
      }
    }),
  );
}

function subscribeSafe(deps: TaskBridgeDeps) {
  return async function subscribe<TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>) => Promise<void>,
  ): Promise<void> {
    try {
      await deps.pubsub.subscribe(topic, async (message) => {
        const result = await schema["~standard"].validate(message.data);
        if (!result.issues) {
          await handler(result.value);
        }
      });
    } catch {
      // Tasks module not installed — silently no-op
    }
  };
}
