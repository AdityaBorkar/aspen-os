import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { ProcessingStartSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const ProcessingStartInputSchema = object({ input: ProcessingStartSchema });

export const processingStart = Workflow.name("diagnostics.processing-start")
  .input(ProcessingStartInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ProcessingStartSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (!["received", "collected", "recollect"].includes(detail)) {
      throw new Error(
        `Processing requires a received sample (now: ${detail}); receive the sample first.`,
      );
    }

    await ctx.step.run("mark-processing", async () => {
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            processingAt: new Date().toISOString(),
            processingBy: parsed.startedBy,
            statusDetail: "processing",
          },
          status: "processing",
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { orderId: order.id, status: "processing" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { orderId: order.id, status: "processing" },
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
