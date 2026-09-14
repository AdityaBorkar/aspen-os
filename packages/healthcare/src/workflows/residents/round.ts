import { healthcareRound } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateRoundSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RoundInputSchema = object({ input: CreateRoundSchema });

export const round = Workflow.name("healthcare.residents.round")
  .input(RoundInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRoundSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const ordersNote = parsed.plan ?? `Follow-up on: ${parsed.findings}`;
    const [row] = await ctx.step.run("insert-round", async () =>
      ctx.db
        .insert(healthcareRound)
        .values({
          branch_id: branchId,
          done_by: parsed.doneBy,
          findings: parsed.findings,
          orders_note: ordersNote,
          plan: parsed.plan ?? null,
          resident_id: resident.id,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record round.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { ordersNote: row.orders_note, residentId: row.resident_id },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, ordersNote: row.orders_note, residentId: row.resident_id };
  });
