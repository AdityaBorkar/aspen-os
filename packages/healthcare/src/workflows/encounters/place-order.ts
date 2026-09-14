import { healthcareClinicOrder } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { PlaceOrderSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep, toClinicOrderDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PlaceOrderInputSchema = object({ input: PlaceOrderSchema });

export const placeOrder = Workflow.name("healthcare.encounters.place-order")
  .input(PlaceOrderInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PlaceOrderSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    const [row] = await ctx.step.run("insert-order", async () =>
      ctx.db
        .insert(healthcareClinicOrder)
        .values({
          branch_id: encounter.branch_id,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          item: parsed.item,
          kind: parsed.kind,
          note: parsed.note ?? null,
          patient_id: parsed.patientId,
          payload: parsed.receivingUnit ? { receivingUnit: parsed.receivingUnit } : {},
          status: "ordered",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to place order.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { encounterId: row.encounter_id, id: row.id, kind: row.kind },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toClinicOrderDto(row);
  });
