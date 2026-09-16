import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { DeliverSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeliverInputSchema = object({ input: DeliverSchema });

export const deliver = Workflow.name("diagnostics.deliver")
  .input(DeliverInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DeliverSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    if (order.status !== "authorized") {
      throw new Error("Only authorized reports can be delivered; authorize the order first.");
    }

    const channel = parsed.channel ?? "print";
    await ctx.step.run("mark-delivered", async () => {
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            deliveredAt: new Date().toISOString(),
            deliveryChannel: channel,
            statusDetail: "delivered",
          },
          status: "delivered",
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { channel, orderId: order.id, status: "delivered" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { channel, orderId: order.id, status: "delivered" },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: order.id,
      });
    });
    return dto;
  });
