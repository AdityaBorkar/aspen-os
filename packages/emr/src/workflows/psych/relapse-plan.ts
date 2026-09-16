import { healthcareRelapsePlan } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateRelapsePlanSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RelapsePlanInputSchema = object({ input: CreateRelapsePlanSchema });

export const relapsePlan = Workflow.name("emr.psych.relapse-plan")
  .input(RelapsePlanInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRelapsePlanSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const [row] = await ctx.step.run("insert-relapse-plan", async () =>
      ctx.db
        .insert(healthcareRelapsePlan)
        .values({
          branch_id: branchId,
          created_by: actorId,
          patient_id: parsed.patientId,
          payload: { followUpDates: parsed.followUpDates ?? [] },
          responses: parsed.responses,
          support_contacts: parsed.supportContacts,
          triggers: parsed.triggers,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the relapse plan.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: { id: row.id, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      followUpDates: parsed.followUpDates ?? [],
      id: row.id,
      patientId: row.patient_id,
      responses: row.responses,
      supportContacts: row.support_contacts,
      triggers: row.triggers,
    };
  });
