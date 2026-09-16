import { healthcareResident } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { FamilySummarySendSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SendFamilySummaryInputSchema = object({ input: FamilySummarySendSchema });

export const sendFamilySummary = Workflow.name("inpatient.residents.send-family-summary")
  .input(SendFamilySummaryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FamilySummarySendSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.id });
    const channel = parsed.channel ?? "whatsapp";
    const delivery = {
      actorId,
      at: new Date().toISOString(),
      channel,
      to: parsed.to,
    } satisfies Record<string, JsonValue>;
    const prior = resident.payload.deliveries;
    const deliveries = [...(Array.isArray(prior) ? prior : []), delivery];
    await ctx.step.run("append-delivery", async () => {
      await ctx.db
        .update(healthcareResident)
        .set({ payload: { ...resident.payload, deliveries } })
        .where(eq(healthcareResident.id, resident.id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: resident.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { channel: parsed.channel ?? "whatsapp", residentId: resident.id, to: parsed.to },
      });
      // Clinical delivery record; comms owns delivery. The comms
      // healthcare-bridge materializes the outbound message from this event.
      await ctx.pubsub.publish(RESIDENT_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          channel,
          healthcareMessageId: resident.id,
          residentId: resident.id,
          to: parsed.to,
        },
        id: resident.id,
      });
    });

    return { deliveries, residentId: resident.id };
  });
