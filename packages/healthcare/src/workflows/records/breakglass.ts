import { healthcareBreakglassGrant } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { BreakGlassSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BreakglassInputSchema = object({ input: BreakGlassSchema });

export const breakglass = Workflow.name("healthcare.records.breakglass")
  .input(BreakglassInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BreakGlassSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-grant", async () =>
      ctx.db
        .insert(healthcareBreakglassGrant)
        .values({
          accessed_by: parsed.accessedBy,
          branch_id: branchId,
          patient_id: parsed.patientId,
          reason: parsed.reason,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record break-glass grant.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.BREAKGLASS,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { accessedBy: row.accessed_by, patientId: row.patient_id, reason: row.reason },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { grant: row.id, patientId: row.patient_id };
  });
