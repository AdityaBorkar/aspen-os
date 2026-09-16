import { complianceDocument } from "#/db-schemas/compliance-document";
import { COMPLIANCE_EVENTS } from "#/pubsub";

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
// compliance is a raw-source package typechecked without a build edge to
// healthcare, and the ACL stays importable without pulling workflow
// graphs), so the shapes below duplicate the ACL values. On drift the ACL
// is the owner. Evidence fields stay pass-through; healthcare statuses are
// never re-mapped here.
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
      attestedBy: nullish(string()),
      control: optional(string()),
      documentName: optional(string()),
      evidencePath: optional(string()),
      // Additive ACL hint (HEALTHCARE-SPEC §15); ignored by this bridge.
      fhir: optional(HealthcareFhirHintSchema),
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
      // Silent-drop stays (no retry storms); the canonical reason is logged.
      deps.log?.warn(`Ignoring malformed event on "healthcare.operations_created".`, {
        topic: "healthcare.operations_created",
      });
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
