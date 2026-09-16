import { healthcareLabOrder, healthcareLabResult } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { AuthorizeSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const AuthorizeInputSchema = object({ input: AuthorizeSchema });

export const authorize = Workflow.name("healthcare.diagnostics.authorize")
  .input(AuthorizeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AuthorizeSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (detail === "cancelled") {
      throw new Error("Lab order is cancelled; it cannot be authorized.");
    }
    const rawEnteredBy = order.payload.enteredBy;
    if (is(string(), rawEnteredBy) && rawEnteredBy === parsed.authorizedBy) {
      throw new Error(
        "Four-eyes violation: authorizer must differ from result enterer; assign another authorizer.",
      );
    }

    const results = await ctx.step.run("fetch-results", async () =>
      ctx.db
        .select({ flag: healthcareLabResult.flag })
        .from(healthcareLabResult)
        .where(
          and(
            eq(healthcareLabResult.branch_id, branchId),
            eq(healthcareLabResult.order_id, parsed.orderId),
          ),
        ),
    );
    if (results.length === 0) {
      throw new Error("No results entered yet; enter results before authorizing.");
    }
    const hasCritical = results.some((row) => row.flag === "critical");
    if (hasCritical && order.payload.criticalAck !== true) {
      throw new Error(
        "Critical result requires acknowledgement before release; record criticalAck first.",
      );
    }

    await ctx.step.run("authorize-order", async () => {
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            authorizedAt: new Date().toISOString(),
            authorizedBy: parsed.authorizedBy,
            authorizerRole: parsed.role,
            draft: false,
            statusDetail: "authorized",
          },
          status: "authorized",
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { orderId: order.id, status: "authorized" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.AUTHORIZED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { authorizedBy: parsed.authorizedBy, orderId: order.id, status: "authorized" },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.AUTHORIZED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          authorizedBy: parsed.authorizedBy,
          complianceOwner: "compliance.verification",
          orderId: order.id,
        },
        id: order.id,
      });
    });
    return dto;
  });
