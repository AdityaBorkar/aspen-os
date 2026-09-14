import { healthcareLabOrder, healthcareLabSample } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { SampleReceiveSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const ReceiveSampleInputSchema = object({ input: SampleReceiveSchema });

export const receiveSample = Workflow.name("healthcare.diagnostics.receive-sample")
  .input(ReceiveSampleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SampleReceiveSchema, input);
    const branchId = parsed.branchId ?? "main";

    const [sample] = await ctx.step.run("load-sample", async () =>
      ctx.db
        .select()
        .from(healthcareLabSample)
        .where(
          and(
            eq(healthcareLabSample.branch_id, branchId),
            eq(healthcareLabSample.barcode, parsed.barcode),
          ),
        )
        .limit(1),
    );
    if (!sample) {
      throw new Error(
        `No collected sample with barcode ${parsed.barcode}; collect the sample first.`,
      );
    }
    if (sample.status === "rejected") {
      throw new Error(
        "Sample was rejected; recollect a fresh sample — results cannot run on rejected specimens (BR-0901).",
      );
    }
    const [order] = await ctx.step.run("load-order", async () =>
      ctx.db
        .select()
        .from(healthcareLabOrder)
        .where(eq(healthcareLabOrder.id, sample.order_id))
        .limit(1),
    );
    if (!order) {
      throw new Error("Parent lab order not found; verify the sample linkage.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (detail === "cancelled") {
      throw new Error("Lab order is cancelled; samples cannot be received against it.");
    }

    const receivedAt = parsed.receivedAt ? new Date(parsed.receivedAt) : new Date();
    await ctx.step.run("receive", async () => {
      await ctx.db
        .update(healthcareLabSample)
        .set({
          payload: {
            ...sample.payload,
            condition: parsed.condition ?? "ok",
            receivedBy: parsed.receivedBy,
          },
          received_at: receivedAt,
          status: "received",
        })
        .where(eq(healthcareLabSample.id, sample.id));
      await ctx.db
        .update(healthcareLabOrder)
        .set({ payload: { ...order.payload, statusDetail: "received" }, status: "received" })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { barcode: parsed.barcode, orderId: order.id, status: "received" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { barcode: parsed.barcode, orderId: order.id, status: "received" },
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
