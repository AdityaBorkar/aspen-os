import { healthcareEncounter } from "#/db-schemas/encounters";
import { toFhirHint } from "#/fhir/event-hint";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { EncounterIdSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep, toEncounterDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SignInputSchema = object({ input: EncounterIdSchema });

export const signEncounter = Workflow.name("healthcare.encounters.sign")
  .input(SignInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EncounterIdSchema, input);
    const current = await ctx.step.run(fetchEncounterStep, { id: parsed.id });
    if (current.status !== "open") {
      throw new Error(`Encounter ${parsed.id} is already signed.`);
    }
    const signedAt = new Date().toISOString();
    const [row] = await ctx.step.run("sign-encounter", async () =>
      ctx.db
        .update(healthcareEncounter)
        .set({
          payload: {
            ...current.payload,
            signedAt,
            signedBy: ctx.actorId ?? null,
          },
          status: "signed",
        })
        .where(eq(healthcareEncounter.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to sign encounter "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SIGNED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.SIGNED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        data: { fhir: toFhirHint("Encounter", row.id) },
        id: row.id,
      });
    });
    return toEncounterDto(row);
  });
