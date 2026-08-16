import { workspaceDashboard, workspaceSchedule } from "#/db-schemas";
import { SCHEDULE_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SCHEDULE_CRON_TOPIC_PREFIX } from "#/utils/constants";

import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export interface ScheduleDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export function scheduleCronTopic(scheduleId: string): string {
  return `${SCHEDULE_CRON_TOPIC_PREFIX}${scheduleId}`;
}

export async function registerScheduleHandler(topic: string, deps: ScheduleDeps): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    const scheduleId = topic.slice(SCHEDULE_CRON_TOPIC_PREFIX.length);
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
    .select({ cron: workspaceSchedule.cron, id: workspaceSchedule.id })
    .from(workspaceSchedule)
    .where(eq(workspaceSchedule.isActive, true));

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
    .from(workspaceSchedule)
    .where(eq(workspaceSchedule.id, scheduleId))
    .limit(1);

  if (!schedule || !schedule.isActive) {
    return;
  }

  const [dashboard] = await deps.db
    .select()
    .from(workspaceDashboard)
    .where(eq(workspaceDashboard.id, schedule.dashboardId))
    .limit(1);

  if (!dashboard) {
    return;
  }

  const at = new Date();
  await deps.pubsub.publish(SCHEDULE_EVENTS.DUE, {
    at: at.toISOString(),
    dashboard,
    schedule,
  });

  await deps.audit.write({
    action: AUDIT_ACTION.DELIVERED,
    crudAction: "update",
    entityId: schedule.id,
    entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
    metadata: { dashboardId: schedule.dashboardId },
  });
}
