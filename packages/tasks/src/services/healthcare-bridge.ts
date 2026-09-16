import { task } from "#/db-schemas/task";
import { TASK_EVENTS } from "#/pubsub";

import type { InferSchemaOutput, LogUnit, PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { array, literal, nullish, object, optional, string } from "valibot";

export interface HealthcareBridgeDeps {
  db: PostgresJsDatabase;
  log?: LogUnit;
  pubsub: PubSubUnit;
}

// Healthcare ACL adoption (HEALTHCARE-SPEC §15): the event envelope,
// `data.fhir` hint shape, and the versioned nursing mirror entry are owned
// by @aspen-os/healthcare (`src/fhir/event-hint.ts` → `FhirHintSchema` /
// `NursingOrderMirrorSchema`, version 1), and the canonical status maps by
// `src/fhir/registries.ts`. This package does not depend on
// @aspen-os/healthcare (dependency decision: no new workspace dependency —
// tasks is a raw-source package typechecked without a build edge to
// healthcare, and the ACL stays importable without pulling workflow
// graphs), so the shapes below duplicate the ACL values. On drift the ACL
// is the owner. `kind` stays pass-through with the healthcare default
// ("general"); this bridge never re-maps healthcare statuses.
const HealthcareFhirHintSchema = object({
  id: string(),
  mapsTo: optional(string()),
  resourceType: string(),
});

const HealthcareOrderEntrySchema = object({
  dueAt: nullish(string()),
  encounterId: nullish(string()),
  healthcareTaskId: string(),
  kind: nullish(string()),
  orderId: nullish(string()),
  patientId: string(),
  status: optional(string()),
  title: string(),
  version: optional(literal(1), 1),
});

const HealthcareEntityEventSchema = object({
  actorId: optional(string()),
  at: string(),
  branchId: string(),
  data: optional(
    object({
      encounterId: optional(string()),
      // Additive ACL hint (HEALTHCARE-SPEC §15); ignored by this bridge.
      fhir: optional(HealthcareFhirHintSchema),
      healthcareTaskId: optional(string()),
      kind: nullish(string()),
      mirrored: optional(array(HealthcareOrderEntrySchema)),
      orderId: optional(string()),
      patientId: nullish(string()),
      title: nullish(string()),
    }),
  ),
  id: string(),
});

type HealthcareEntityEvent = InferSchemaOutput<typeof HealthcareEntityEventSchema>;

interface OrderIntent {
  branchId: string;
  dueAt: string | null;
  encounterId: string | null;
  healthcareTaskId: string;
  kind: string;
  orderId: string | null;
  patientId: string;
  reporterId: string;
  title: string;
}

function intentProjectId(branchId: string): string {
  return `healthcare-${branchId}`;
}

function intentDescription(intent: OrderIntent): string {
  return JSON.stringify({
    branchId: intent.branchId,
    encounterId: intent.encounterId,
    healthcareTaskId: intent.healthcareTaskId,
    kind: intent.kind,
    orderId: intent.orderId,
    patientId: intent.patientId,
  });
}

async function createTaskForOrder(intent: OrderIntent, deps: HealthcareBridgeDeps): Promise<void> {
  const existing = await deps.db
    .select({ id: task.id })
    .from(task)
    .where(eq(task.id, intent.healthcareTaskId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const dueDate = intent.dueAt ? new Date(intent.dueAt) : null;
  const validDueDate = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;

  // Clinical order stays in healthcare; fulfilment becomes a tasks.task with
  // the clinical ids attached. The nursing board stays a clinical read view
  // over healthcare_nursing_task; tasks owns execution/status/automation.
  // The deterministic id (healthcare task id) keeps the bridge idempotent
  // without a cross-module lookup table.
  const [created] = await deps.db
    .insert(task)
    .values({
      description: intentDescription(intent),
      due_date: validDueDate,
      id: intent.healthcareTaskId,
      labels: ["healthcare", intent.kind],
      priority: "none",
      project_id: intentProjectId(intent.branchId),
      reporter_id: intent.reporterId,
      status_id: "open",
      title: intent.title,
    })
    .returning();
  if (!created) {
    return;
  }

  await deps.pubsub.publish(TASK_EVENTS.CREATED, {
    due_date: created.due_date ? created.due_date.toISOString() : null,
    task: {
      id: created.id,
      number: created.number,
      projectId: created.project_id,
      title: created.title,
    },
  });
  if (created.due_date) {
    await deps.pubsub.publish(TASK_EVENTS.DUE_DATE_CHANGED, {
      dueDate: created.due_date.toISOString(),
      taskId: created.id,
      userIds: [created.reporter_id],
    });
  }
}

async function handleNursingCreated(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const mirrored = event.data?.mirrored;
  if (!mirrored || mirrored.length === 0) {
    return;
  }
  const reporterId = event.actorId ?? "system";
  // oxlint-disable eslint/no-await-in-loop
  for (const entry of mirrored) {
    await createTaskForOrder(
      {
        branchId: event.branchId,
        dueAt: entry.dueAt ?? null,
        encounterId: entry.encounterId ?? null,
        healthcareTaskId: entry.healthcareTaskId,
        kind: entry.kind ?? "general",
        orderId: entry.orderId ?? null,
        patientId: entry.patientId,
        reporterId,
        title: entry.title,
      },
      deps,
    );
  }
  // oxlint-enable eslint/no-await-in-loop
}

async function handleEncounterUpdated(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const { data } = event;
  const healthcareTaskId = data?.healthcareTaskId ?? data?.orderId;
  const patientId = data?.patientId;
  const title = data?.title;
  if (!healthcareTaskId || !patientId || !title) {
    return;
  }
  await createTaskForOrder(
    {
      branchId: event.branchId,
      dueAt: null,
      encounterId: data?.encounterId ?? event.id,
      healthcareTaskId,
      kind: data?.kind ?? "general",
      orderId: data?.orderId ?? healthcareTaskId,
      patientId,
      reporterId: event.actorId ?? "system",
      title,
    },
    deps,
  );
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

export async function registerHealthcareBridge(deps: HealthcareBridgeDeps): Promise<string[]> {
  await subscribeHealthcareTopic(deps, "healthcare.nursing_created", handleNursingCreated);
  await subscribeHealthcareTopic(deps, "healthcare.encounter_updated", handleEncounterUpdated);
  return ["healthcare.nursing_created", "healthcare.encounter_updated"];
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
