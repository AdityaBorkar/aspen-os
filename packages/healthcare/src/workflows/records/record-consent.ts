import { RECORDS_EVENTS } from "#/pubsub";
import { RecordConsentSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { insertGrantConsent } from "#/workflows/shared/consent-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RecordConsentInputSchema = object({ input: RecordConsentSchema });

export const recordConsent = Workflow.name("healthcare.records.record-consent")
  .input(RecordConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordConsentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const row = await ctx.step.run("insert-consent", async () =>
      insertGrantConsent(ctx.db, {
        branchId,
        encounterId: parsed.encounterId ?? null,
        grantedBy: parsed.grantedBy ?? ctx.actorId ?? null,
        kind: parsed.kind,
        patientId: parsed.patientId,
      }),
    );
    if (!row) {
      throw new Error("Failed to record consent.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { kind: row.kind, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, kind: row.kind, patientId: row.patient_id };
  });
