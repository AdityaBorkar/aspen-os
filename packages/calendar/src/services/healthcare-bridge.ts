import { calendarEvent, calendarReminder } from "#/db-schemas";
import { EVENT_EVENTS, REMINDER_EVENTS } from "#/pubsub";
import { toEventPayload, toReminderPayload } from "#/workflow-steps/payloads";

import type { InferSchemaOutput, LogUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullish, object, optional, string } from "valibot";

export interface HealthcareBridgeDeps {
  db: PostgresJsDatabase;
  log?: LogUnit;
  pubsub: PubSubUnit;
}

// Healthcare ACL adoption (HEALTHCARE-SPEC §15): the event envelope and
// `data.fhir` hint shape are owned by @aspen-os/healthcare
// (`src/fhir/event-hint.ts` → `FhirHintSchema`), and the canonical status
// maps by `src/fhir/registries.ts`. This package does not depend on
// @aspen-os/healthcare (dependency decision: no new workspace dependency —
// calendar builds without healthcare in the graph, and the ACL stays
// importable without pulling workflow graphs), so the shapes below
// duplicate the ACL values. On drift the ACL is the owner. This bridge
// never branches on healthcare statuses — it reads only scheduling
// fields — so there are no status literals to adopt here.
const HealthcareFhirHintSchema = object({
  id: string(),
  mapsTo: optional(string()),
  resourceType: string(),
});

const HealthcareEntityEventSchema = object({
  actorId: optional(string()),
  at: string(),
  branchId: string(),
  data: optional(
    object({
      appointmentId: optional(string()),
      // Additive ACL hint (HEALTHCARE-SPEC §15); ignored by this bridge.
      fhir: optional(HealthcareFhirHintSchema),
      patientId: nullish(string()),
      practitionerId: nullish(string()),
      reason: nullish(string()),
      recallAt: optional(string()),
      recallId: optional(string()),
      slotStart: optional(string()),
    }),
  ),
  id: string(),
});

type HealthcareEntityEvent = InferSchemaOutput<typeof HealthcareEntityEventSchema>;

function healthcareCalendarId(branchId: string): string {
  return `healthcare-${branchId}`;
}

async function handleAppointmentCreated(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const { data } = event;
  const appointmentId = data?.appointmentId ?? event.id;
  const slotStart = data?.slotStart;
  const patientId = data?.patientId;
  if (!slotStart || !patientId) {
    return;
  }
  const startsAt = new Date(slotStart);
  if (Number.isNaN(startsAt.getTime())) {
    return;
  }

  const existing = await deps.db
    .select({ id: calendarEvent.id })
    .from(calendarEvent)
    .where(
      and(
        eq(calendarEvent.source_type, "healthcare_appointment"),
        eq(calendarEvent.source_entity_id, appointmentId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const [created] = await deps.db
    .insert(calendarEvent)
    .values({
      calendar_id: healthcareCalendarId(event.branchId),
      created_by: "healthcare-bridge",
      description: `Patient ${patientId}`,
      source_entity_id: appointmentId,
      source_type: "healthcare_appointment",
      starts_at: startsAt,
      status: "confirmed",
      title: `Appointment ${appointmentId}`,
    })
    .returning();
  if (!created) {
    return;
  }

  await deps.pubsub.publish(EVENT_EVENTS.CREATED, {
    calendarId: created.calendar_id,
    event: toEventPayload(created),
    sourceEntityId: created.source_entity_id,
    sourceType: created.source_type,
  });
}

async function handleRecallIntent(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const { data } = event;
  const recallId = data?.recallId;
  const recallAt = data?.recallAt;
  const patientId = data?.patientId;
  if (!recallId || !recallAt || !patientId) {
    return;
  }
  const remindAt = new Date(recallAt);
  if (Number.isNaN(remindAt.getTime())) {
    return;
  }

  const existing = await deps.db
    .select({ id: calendarReminder.id })
    .from(calendarReminder)
    .where(
      and(eq(calendarReminder.target_type, "custom"), eq(calendarReminder.target_id, recallId)),
    )
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const [created] = await deps.db
    .insert(calendarReminder)
    .values({
      channel: "pubsub",
      created_by: "healthcare-bridge",
      message: data?.reason ?? `Recall ${recallId}`,
      remind_at: remindAt,
      target_id: recallId,
      target_type: "custom",
      type: "custom",
      user_id: patientId,
    })
    .returning();
  if (!created) {
    return;
  }

  await deps.pubsub.publish(REMINDER_EVENTS.CREATED, {
    reminder: toReminderPayload(created),
  });
}

async function subscribeHealthcareTopic(
  deps: HealthcareBridgeDeps,
  topic: string,
  handler: (event: HealthcareEntityEvent, deps: HealthcareBridgeDeps) => Promise<void>,
): Promise<void> {
  await deps.pubsub.subscribe(topic, async (message) => {
    const result = await HealthcareEntityEventSchema["~standard"].validate(message.data);
    if (result.issues) {
      // Silent-drop stays (no retry storms); the canonical reason is logged.
      deps.log?.warn(`Ignoring malformed event on "${topic}".`, { topic });
      return;
    }
    await handler(result.value, deps);
  });
}

export interface HealthcareBridgeOptions {
  enabled?: boolean;
}

export async function registerHealthcareBridge(
  deps: HealthcareBridgeDeps,
  options?: HealthcareBridgeOptions,
): Promise<string[]> {
  if (options?.enabled === false) {
    return [];
  }
  await subscribeHealthcareTopic(deps, "healthcare.appointment_created", handleAppointmentCreated);
  await subscribeHealthcareTopic(deps, "healthcare.appointment_updated", handleRecallIntent);
  await subscribeHealthcareTopic(deps, "healthcare.patient_updated", handleRecallIntent);
  return [
    "healthcare.appointment_created",
    "healthcare.appointment_updated",
    "healthcare.patient_updated",
  ];
}

export async function unregisterHealthcareBridge(
  topics: string[],
  deps: Pick<HealthcareBridgeDeps, "pubsub">,
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await deps.pubsub.unsubscribe(topic);
      } catch {
        // Best-effort cleanup
      }
    }),
  );
}
