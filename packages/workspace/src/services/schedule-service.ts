import { workspaceDashboard, workspaceDeliverySchedule } from "#/db-schemas";
import { DELIVERY_SCHEDULE_EVENTS } from "#/pubsub";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  DELIVERY_SCHEDULE_CRON_TOPIC_PREFIX,
  SCHEDULE_CRON_TOPIC_PREFIX,
} from "#/utils/constants";

import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ScheduleDeps {
  audit: AuditUnit;
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

export function scheduleCronTopic(scheduleId: string): string {
  return `${DELIVERY_SCHEDULE_CRON_TOPIC_PREFIX}${scheduleId}`;
}

export async function registerScheduleHandler(topic: string, deps: ScheduleDeps): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    let scheduleId: string | null = null;
    if (topic.startsWith(DELIVERY_SCHEDULE_CRON_TOPIC_PREFIX)) {
      scheduleId = topic.slice(DELIVERY_SCHEDULE_CRON_TOPIC_PREFIX.length);
    } else if (topic.startsWith(SCHEDULE_CRON_TOPIC_PREFIX)) {
      scheduleId = topic.slice(SCHEDULE_CRON_TOPIC_PREFIX.length);
    }
    if (!scheduleId) {
      return;
    }
    await deliverDueSchedule(deps, scheduleId);
  });
}

export async function unregisterScheduleHandler(
  topic: string,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort
  }
}

export async function registerScheduleDelivery(
  deps: ScheduleDeps,
  schedule: { cron: string; id: string },
): Promise<string> {
  const topic = scheduleCronTopic(schedule.id);
  // Migrate legacy schedule topic if present.
  try {
    await deps.pubsub.unschedule(`${SCHEDULE_CRON_TOPIC_PREFIX}${schedule.id}`);
  } catch {
    // Best-effort legacy cleanup
  }
  await deps.pubsub.schedule({
    cron: schedule.cron,
    data: { scheduleId: schedule.id },
    topic,
  });
  await registerScheduleHandler(topic, deps);
  return topic;
}

export async function registerScheduleRunner(deps: ScheduleDeps): Promise<string[]> {
  const schedules = await deps.db
    .select({ cron: workspaceDeliverySchedule.cron, id: workspaceDeliverySchedule.id })
    .from(workspaceDeliverySchedule)
    .where(eq(workspaceDeliverySchedule.is_active, true));

  return Promise.all(schedules.map((schedule) => registerScheduleDelivery(deps, schedule)));
}

export async function unregisterScheduleRunner(
  topics: string[],
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  await Promise.all(topics.map((topic) => unregisterScheduleHandler(topic, { pubsub })));
}

export async function deliverDueSchedule(deps: ScheduleDeps, scheduleId: string): Promise<void> {
  const [schedule] = await deps.db
    .select()
    .from(workspaceDeliverySchedule)
    .where(eq(workspaceDeliverySchedule.id, scheduleId))
    .limit(1);

  if (!schedule || !schedule.is_active) {
    return;
  }

  const [dashboard] = await deps.db
    .select()
    .from(workspaceDashboard)
    .where(eq(workspaceDashboard.id, schedule.dashboard_id))
    .limit(1);

  if (!dashboard) {
    return;
  }

  // Publish canonical delivery event; also publish legacy for hosts still on old topic.
  await deps.pubsub.publish(DELIVERY_SCHEDULE_EVENTS.DUE, {
    at: new Date().toISOString(),
    dashboard,
    schedule,
  });
  try {
    const { SCHEDULE_EVENTS: LegacyScheduleEvents } = await import("#/pubsub");
    await deps.pubsub.publish(LegacyScheduleEvents.DUE, {
      at: new Date().toISOString(),
      dashboard,
      schedule,
    });
  } catch {
    // Back-compat publish is best-effort
  }

  await deps.audit.write({
    action: AUDIT_ACTION.DELIVERED,
    crudAction: "update",
    entityId: schedule.id,
    entityType: AUDIT_ENTITY_TYPE.DELIVERY_SCHEDULE,
    metadata: { dashboardId: schedule.dashboard_id },
  });
}

// New canonical names — old schedule names remain as aliases for back-compat.
export const deliveryScheduleCronTopic = scheduleCronTopic;
export const registerDeliveryScheduleDelivery = registerScheduleDelivery;
export const registerDeliveryScheduleHandler = registerScheduleHandler;
export const unregisterDeliveryScheduleHandler = unregisterScheduleHandler;
export const registerDeliveryScheduleRunner = registerScheduleRunner;
export const unregisterDeliveryScheduleRunner = unregisterScheduleRunner;
export const deliverDueDeliverySchedule = deliverDueSchedule;
