import { healthcareResident } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { FamilySummarySendSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";
import { assertRecipientOptedIn, queueOutboundMessage } from "#/workflows/shared/messaging";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SendFamilySummaryInputSchema = object({ input: FamilySummarySendSchema });

export const sendFamilySummary = Workflow.name("healthcare.residents.sendFamilySummary")
  .input(SendFamilySummaryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FamilySummarySendSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.id });
    const channel = parsed.channel ?? "whatsapp";
    await ctx.step.run("check-optout", async () => {
      await assertRecipientOptedIn(ctx.db, branchId, parsed.to);
    });
    await ctx.step.run("queue-message", async () =>
      queueOutboundMessage(ctx.db, {
        branchId,
        channel,
        patientId: null,
        to: parsed.to,
      }),
    );
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
      await ctx.pubsub.publish(RESIDENT_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: resident.id,
      });
    });

    return { deliveries, residentId: resident.id };
  });
