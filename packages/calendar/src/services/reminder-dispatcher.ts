import { getCalendarConfig } from "#/runtime";
import { SCHEDULED_JOBS } from "#/utils/constants";
import { processPendingReminders } from "#/workflows/reminder/process-pending";

import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ReminderDispatcherDeps {
  audit: AuditUnit;
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

export async function registerReminderDispatcher(deps: ReminderDispatcherDeps): Promise<string> {
  const topic = SCHEDULED_JOBS.REMINDER_SCAN;
  const cron = getCalendarConfig().reminderScanCron;

  await deps.pubsub.schedule({
    cron,
    data: {},
    topic,
  });

  await deps.pubsub.subscribe(topic, async () => {
    await processPendingReminders.run(undefined, {
      audit: deps.audit,
      db: deps.db,
      pubsub: deps.pubsub,
    });
  });

  return topic;
}

export async function unregisterReminderDispatcher(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort
  }
}
