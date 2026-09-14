import { healthcareEncounterAddendum } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { AddEncounterAddendumSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep, toEncounterAddendumDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddendumInputSchema = object({ input: AddEncounterAddendumSchema });

export const addEncounterAddendum = Workflow.name("healthcare.encounters.addendum")
  .input(AddendumInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddEncounterAddendumSchema, input);
    // Addenda are the only writes allowed after sign, so this uses the plain
    // fetch step (no open-status gate) deliberately.
    const encounter = await ctx.step.run(fetchEncounterStep, {
      id: parsed.encounterId,
    });
    const [row] = await ctx.step.run("insert-addendum", async () =>
      ctx.db
        .insert(healthcareEncounterAddendum)
        .values({
          branch_id: encounter.branch_id,
          created_by: ctx.actorId ?? null,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          note: parsed.note,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save addendum.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { encounterId: row.encounter_id, id: row.id },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toEncounterAddendumDto(row);
  });
