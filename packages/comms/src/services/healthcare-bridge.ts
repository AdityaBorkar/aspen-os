import { commsMessage, commsNotification } from "#/db-schemas";
import { MESSAGE_EVENTS, NOTIFICATION_EVENTS } from "#/pubsub";

import type { InferSchemaOutput, LogUnit, PubSubUnit } from "@aspen-os/platform/server";
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
// comms builds without healthcare in the graph, and the ACL stays
// importable without pulling workflow graphs), so the shapes below
// duplicate the ACL values. On drift the ACL is the owner. Channel mapping
// stays comms-owned; healthcare statuses are never re-mapped here.
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
      channel: optional(string()),
      docId: nullish(string()),
      // Additive ACL hint (HEALTHCARE-SPEC §15); ignored by this bridge.
      fhir: optional(HealthcareFhirHintSchema),
      healthcareMessageId: optional(string()),
      healthcareShareId: optional(string()),
      patientId: nullish(string()),
      residentId: optional(string()),
      to: optional(string()),
    }),
  ),
  id: string(),
});

type HealthcareEntityEvent = InferSchemaOutput<typeof HealthcareEntityEventSchema>;

function asMessageChannelType(channel: string | undefined): "sms" | "whatsapp" | "other" {
  if (channel === "whatsapp") {
    return "whatsapp";
  }
  if (channel === "sms") {
    return "sms";
  }
  return "other";
}

async function handleHealthcareMessage(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const { data } = event;
  const to = data?.to;
  const healthcareMessageId =
    data?.healthcareMessageId ?? data?.healthcareShareId ?? data?.residentId;
  if (!to || !healthcareMessageId) {
    return;
  }
  const channelType = asMessageChannelType(data?.channel);
  const patientId = data?.patientId ?? null;
  const now = new Date();

  const [notification] = await deps.db
    .insert(commsNotification)
    .values({
      body: `Healthcare message ${healthcareMessageId}`,
      channel_types: [channelType],
      metadata: {
        branchId: event.branchId,
        healthcareMessageId,
        patientId,
      },
      recipient_id: to,
      recipient_type: "contact",
      source_entity: { id: healthcareMessageId, type: "healthcare_message" },
      source_module: "healthcare",
      title: "Healthcare message",
      to: { phone: to },
      type: "healthcare_message",
    })
    .returning();
  if (!notification) {
    return;
  }

  const [message] = await deps.db
    .insert(commsMessage)
    .values({
      body: `Healthcare message ${healthcareMessageId}`,
      channel_type: channelType,
      metadata: {
        branchId: event.branchId,
        healthcareMessageId,
        patientId,
      },
      notification_id: notification.id,
      queued_at: now,
      status: "queued",
      to,
    })
    .returning();
  if (!message) {
    return;
  }

  await deps.pubsub.publish(NOTIFICATION_EVENTS.CREATED, {
    channelTypes: [channelType],
    notificationId: notification.id,
    recipientId: notification.recipient_id,
    recipientType: notification.recipient_type,
    type: notification.type,
  });
  await deps.pubsub.publish(MESSAGE_EVENTS.QUEUED, {
    channelType: message.channel_type,
    messageId: message.id,
    to: message.to,
  });
}

async function subscribeHealthcareTopic(deps: HealthcareBridgeDeps, topic: string): Promise<void> {
  await deps.pubsub.subscribe(topic, async (message) => {
    const result = await HealthcareEntityEventSchema["~standard"].validate(message.data);
    if (result.issues) {
      // Silent-drop stays (no retry storms); the canonical reason is logged.
      deps.log?.warn(`Ignoring malformed event on "${topic}".`, { topic });
      return;
    }
    await handleHealthcareMessage(result.value, deps);
  });
}

const HEALTHCARE_MESSAGE_TOPICS = [
  "healthcare.records_created",
  "healthcare.resident_updated",
] as const;

export async function registerHealthcareBridge(deps: HealthcareBridgeDeps): Promise<string[]> {
  await Promise.all(
    HEALTHCARE_MESSAGE_TOPICS.map(async (topic) => subscribeHealthcareTopic(deps, topic)),
  );
  return [...HEALTHCARE_MESSAGE_TOPICS];
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
