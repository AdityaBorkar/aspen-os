import { healthcareFollowUp } from "#/db-schemas/encounters";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { IssueRecallSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toFollowUpDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const IssueRecallInputSchema = object({ input: IssueRecallSchema });

export const issueRecall = Workflow.name("healthcare.appointments.issue-recall")
  .input(IssueRecallInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(IssueRecallSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.at)) {
      throw new Error(`Recall date "${parsed.at}" must be YYYY-MM-DD.`);
    }
    const [row] = await ctx.step.run("insert-recall", async () =>
      ctx.db
        .insert(healthcareFollowUp)
        .values({
          at: parsed.at,
          branch_id: branchId,
          encounter_id: null,
          id: crypto.randomUUID(),
          patient_id: parsed.patientId,
          payload: { kind: "recall", reason: parsed.reason },
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue recall.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: {
          at: row.at,
          id: row.id,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });
    return toFollowUpDto(row);
  });
