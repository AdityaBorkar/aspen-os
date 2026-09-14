import {
  healthcareLabOrder,
  healthcareLabResult,
  healthcareLabTest,
} from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { ResultEntrySchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const ResultEntryInputSchema = object({ input: ResultEntrySchema });

export const resultEnter = Workflow.name("healthcare.diagnostics.result-enter")
  .input(ResultEntryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResultEntrySchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (detail === "cancelled") {
      throw new Error("Lab order is cancelled; results cannot be entered against it.");
    }
    if (detail === "authorized" || detail === "delivered" || detail === "billed") {
      throw new Error("Report is already authorized or beyond; amend via a fresh order.");
    }

    const prior = await ctx.step.run("fetch-prior-results", async () =>
      ctx.db
        .select()
        .from(healthcareLabResult)
        .where(
          and(
            eq(healthcareLabResult.branch_id, branchId),
            eq(healthcareLabResult.order_id, parsed.orderId),
            eq(healthcareLabResult.test_code, parsed.testCode),
          ),
        ),
    );
    const version = prior.length + 1;

    const ref = await ctx.step.run("fetch-test-ref", async () => {
      const [row] = await ctx.db
        .select({
          ref_high: healthcareLabTest.ref_high,
          ref_low: healthcareLabTest.ref_low,
        })
        .from(healthcareLabTest)
        .where(
          and(
            eq(healthcareLabTest.branch_id, branchId),
            eq(healthcareLabTest.code, parsed.testCode),
          ),
        )
        .limit(1);
      return row ?? null;
    });

    let flag = parsed.flag ?? "normal";
    const numericValue = Number(parsed.value);
    const valueIsNumeric = parsed.value.trim() !== "" && Number.isFinite(numericValue);
    if (!parsed.flag && valueIsNumeric && ref) {
      const low = ref.ref_low === null ? null : Number(ref.ref_low);
      const high = ref.ref_high === null ? null : Number(ref.ref_high);
      if (low !== null && numericValue < low) {
        flag = "L";
      } else if (high !== null && numericValue > high) {
        flag = "H";
      }
    }

    let delta: number | null = null;
    const lastPrior = prior[prior.length - 1];
    if (valueIsNumeric && lastPrior) {
      const priorNumeric = Number(lastPrior.value);
      if (lastPrior.value.trim() !== "" && Number.isFinite(priorNumeric)) {
        delta = numericValue - priorNumeric;
      }
    }

    const entered = await ctx.step.run("enter-result", async () => {
      const [row] = await ctx.db
        .insert(healthcareLabResult)
        .values({
          branch_id: branchId,
          entered_by: parsed.enteredBy,
          flag,
          order_id: parsed.orderId,
          payload: { delta },
          test_code: parsed.testCode,
          value: parsed.value,
          version,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to enter result.");
      }
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            draft: true,
            enteredBy: parsed.enteredBy,
            statusDetail: "resulted",
          },
          status: "processing",
        })
        .where(eq(healthcareLabOrder.id, order.id));
      return row;
    });

    const dto = {
      delta,
      draftWatermark: true as const,
      enteredAt: entered.entered_at.toISOString(),
      enteredBy: entered.entered_by,
      flag: entered.flag,
      orderId: entered.order_id,
      testCode: entered.test_code,
      value: entered.value,
      version: entered.version,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: entered.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { flag, orderId: parsed.orderId, testCode: parsed.testCode, version },
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
