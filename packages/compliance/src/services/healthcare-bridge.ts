import { complianceDocument } from "#/db-schemas/compliance-document";
import { COMPLIANCE_EVENTS } from "#/pubsub";

import type { InferSchemaOutput, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullish, object, optional, string } from "valibot";

export interface HealthcareBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

const HealthcareEntityEventSchema = object({
  actorId: optional(string()),
  at: string(),
  branchId: string(),
  data: optional(
    object({
      attestedBy: nullish(string()),
      control: optional(string()),
      documentName: optional(string()),
      evidencePath: optional(string()),
      framework: optional(string()),
      healthcareEvidenceId: optional(string()),
    }),
  ),
  id: string(),
});

type HealthcareEntityEvent = InferSchemaOutput<typeof HealthcareEntityEventSchema>;

async function handleHealthcareEvidence(
  event: HealthcareEntityEvent,
  deps: HealthcareBridgeDeps,
): Promise<void> {
  const { data } = event;
  const healthcareEvidenceId = data?.healthcareEvidenceId;
  const control = data?.control;
  if (!healthcareEvidenceId || !control) {
    return;
  }

  const existing = await deps.db
    .select({ id: complianceDocument.id })
    .from(complianceDocument)
    .where(
      and(
        eq(complianceDocument.source_module, "healthcare"),
        eq(complianceDocument.source_entity_id, healthcareEvidenceId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const [created] = await deps.db
    .insert(complianceDocument)
    .values({
      attachment: data?.evidencePath ?? null,
      branch: event.branchId,
      category: "regulatory",
      created_by: data?.attestedBy ?? event.actorId ?? "system",
      metadata: {
        control,
        framework: data?.framework ?? null,
        healthcareEvidenceId,
      },
      name: data?.documentName ?? `${data?.framework ?? "Healthcare"} ${control}`,
      source_entity_id: healthcareEvidenceId,
      source_entity_type: "healthcare_compliance_evidence",
      source_module: "healthcare",
    })
    .returning();
  if (!created) {
    return;
  }

  await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
    document: {
      category: created.category,
      id: created.id,
      name: created.name,
    },
  });
}

export async function registerHealthcareBridge(deps: HealthcareBridgeDeps): Promise<string[]> {
  await deps.pubsub.subscribe("healthcare.operations_created", async (message) => {
    const result = await HealthcareEntityEventSchema["~standard"].validate(message.data);
    if (result.issues) {
      return;
    }
    await handleHealthcareEvidence(result.value, deps);
  });
  return ["healthcare.operations_created"];
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
