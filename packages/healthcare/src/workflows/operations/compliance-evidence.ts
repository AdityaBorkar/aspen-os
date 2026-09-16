import { healthcareComplianceEvidence } from "#/db-schemas/operations";
import { complianceDocumentName } from "#/integrations/compliance";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { RecordComplianceEvidenceSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ComplianceEvidenceInputSchema = object({ input: RecordComplianceEvidenceSchema });

export const complianceEvidence = Workflow.name("healthcare.operations.compliance-evidence")
  .input(ComplianceEvidenceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordComplianceEvidenceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-evidence", async () =>
      ctx.db
        .insert(healthcareComplianceEvidence)
        .values({
          attested_by: parsed.attestedBy ?? null,
          branch_id: branchId,
          control: parsed.control,
          evidence_path: parsed.evidencePath,
          framework: parsed.framework,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record compliance evidence.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { control: row.control, framework: row.framework },
      });
      // Healthcare emits evidence; compliance owns the evidence store
      // (obligation/verification/document/audit). The bridge materializes a
      // compliance.document with the clinical ids attached.
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          attestedBy: row.attested_by ?? null,
          control: row.control,
          documentName: complianceDocumentName({
            branchId,
            control: row.control,
            evidencePath: row.evidence_path,
            framework: row.framework,
            healthcareEvidenceId: row.id,
          }),
          evidencePath: row.evidence_path,
          framework: row.framework,
          healthcareEvidenceId: row.id,
        },
        id: row.id,
      });
    });
    return { control: row.control, framework: row.framework, id: row.id };
  });
