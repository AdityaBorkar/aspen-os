import { healthcareFollowUp } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { SetFollowUpSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep, toFollowUpDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetFollowUpInputSchema = object({ input: SetFollowUpSchema });

export const setFollowUp = Workflow.name("healthcare.encounters.set-follow-up")
  .input(SetFollowUpInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetFollowUpSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.at)) {
      throw new Error(`Follow-up date "${parsed.at}" must be YYYY-MM-DD.`);
    }
    const [row] = await ctx.step.run("insert-follow-up", async () =>
      ctx.db
        .insert(healthcareFollowUp)
        .values({
          at: parsed.at,
          branch_id: encounter.branch_id,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          note: parsed.note ?? null,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save follow-up.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { at: row.at, encounterId: row.encounter_id, id: row.id },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toFollowUpDto(row);
  });
