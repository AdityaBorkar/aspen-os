import { healthcareLabOrder, healthcareLabSample } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { SampleCollectSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const SampleCollectInputSchema = object({ input: SampleCollectSchema });
export const collectSample = Workflow.name("diagnostics.collect-sample")
  .input(SampleCollectInputSchema)
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
      throw new Error("Lab order is cancelled; samples cannot be collected against it.");
    }
    if (detail === "authorized" || detail === "delivered" || detail === "billed") {
      throw new Error(
        "Report is already authorized or beyond; a fresh order is required for re-collection.",
      );
    }

    const clash = await ctx.step.run("check-barcode", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareLabSample.id })
        .from(healthcareLabSample)
        .where(
          and(
            eq(healthcareLabSample.branch_id, branchId),
            eq(healthcareLabSample.barcode, parsed.barcode),
          ),
        )
        .limit(1);
      return row ?? null;
    });
    if (clash) {
      throw new Error(
        `Barcode ${parsed.barcode} is already in the sample chain; use a fresh barcode.`,
      );
    }

    const collectedAt = parsed.collectedAt ?? new Date().toISOString();
    await ctx.step.run("collect", async () => {
      await ctx.db.insert(healthcareLabSample).values({
        barcode: parsed.barcode,
        branch_id: branchId,
        collected_at: new Date(collectedAt),
        collected_by: parsed.collectedBy,
        order_id: parsed.orderId,
        status: "collected",
      });
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            barcode: parsed.barcode,
            collectedAt,
            collectedBy: parsed.collectedBy,
            statusDetail: "collected",
          },
          status: "collected",
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = {
      barcode: parsed.barcode,
      collectedAt,
      orderId: parsed.orderId,
      status: "collected" as const,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.COLLECTED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { barcode: parsed.barcode, orderId: order.id, status: "collected" },
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
