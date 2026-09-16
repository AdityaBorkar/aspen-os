import { healthcareLabOrder, healthcareLabSample } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { SampleRejectSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SampleRejectInputSchema = object({ input: SampleRejectSchema });

export const sampleReject = Workflow.name("diagnostics.sample-reject")
  .input(SampleRejectInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SampleRejectSchema, input);
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
      throw new Error(`No sample with barcode ${parsed.barcode}; verify the barcode.`);
    }
    if (sample.status === "received") {
      throw new Error("Sample already received; reject before receive, or recollect instead.");
    }

    await ctx.step.run("reject", async () => {
      await ctx.db
        .update(healthcareLabSample)
        .set({
          payload: {
            ...sample.payload,
            rejectNote: parsed.note ?? null,
            rejectReason: parsed.reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: parsed.rejectedBy,
          },
          status: "rejected",
        })
        .where(eq(healthcareLabSample.id, sample.id));
      const [order] = await ctx.db
        .select()
        .from(healthcareLabOrder)
        .where(eq(healthcareLabOrder.id, sample.order_id))
        .limit(1);
      if (order) {
        await ctx.db
          .update(healthcareLabOrder)
          .set({
            payload: {
              ...order.payload,
              recollectReason: parsed.reason,
              statusDetail: "recollect",
            },
          })
          .where(eq(healthcareLabOrder.id, order.id));
      }
    });

    const dto = {
      barcode: parsed.barcode,
      orderId: sample.order_id,
      reason: parsed.reason,
      status: "rejected" as const,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: sample.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { barcode: parsed.barcode, reason: parsed.reason, status: "rejected" },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: sample.id,
      });
    });
    return dto;
  });
