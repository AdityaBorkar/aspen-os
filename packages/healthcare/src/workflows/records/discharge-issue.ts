import { healthcareDischargeSummary } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { IssueDischargeSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const DischargeIssueInputSchema = object({ input: IssueDischargeSchema });

export const dischargeIssue = Workflow.name("healthcare.records.discharge-issue")
  .input(DischargeIssueInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(IssueDischargeSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-discharge", async () =>
      ctx.db
        .insert(healthcareDischargeSummary)
        .values({
          branch_id: branchId,
          encounter_id: parsed.encounterId,
          issued_by: parsed.issuedBy,
          summary: parsed.summary,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue discharge summary.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { encounterId: row.encounter_id },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { encounterId: row.encounter_id, id: row.id };
  });
