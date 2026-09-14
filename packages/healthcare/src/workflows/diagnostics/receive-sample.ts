import { healthcareLabOrder, healthcareLabSample } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { SampleCollectSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const ReceiveSampleInputSchema = object({ input: SampleCollectSchema });

export const receiveSample = Workflow.name("healthcare.diagnostics.receive-sample")
  .input(ReceiveSampleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SampleCollectSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (detail === "cancelled") {
      throw new Error("Lab order is cancelled; samples cannot be received against it.");
    }

    await ctx.step.run("receive", async () => {
      const [sample] = await ctx.db
        .select({ id: healthcareLabSample.id })
        .from(healthcareLabSample)
        .where(
          and(
            eq(healthcareLabSample.branch_id, branchId),
            eq(healthcareLabSample.order_id, parsed.orderId),
          ),
        )
        .limit(1);
      const receivedAt = new Date();
      if (sample) {
        await ctx.db
          .update(healthcareLabSample)
          .set({ received_at: receivedAt, status: "received" })
          .where(eq(healthcareLabSample.id, sample.id));
      } else {
        await ctx.db.insert(healthcareLabSample).values({
          barcode: parsed.barcode,
          branch_id: branchId,
          collected_at: parsed.collectedAt ? new Date(parsed.collectedAt) : receivedAt,
          collected_by: parsed.collectedBy,
          order_id: parsed.orderId,
          received_at: receivedAt,
          status: "received",
        });
      }
      await ctx.db
        .update(healthcareLabOrder)
        .set({ payload: { ...order.payload, statusDetail: "received" }, status: "received" })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { orderId: parsed.orderId, status: "received" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { orderId: order.id, status: "received" },
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
