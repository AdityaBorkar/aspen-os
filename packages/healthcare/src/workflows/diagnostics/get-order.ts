import { healthcareLabResult } from "#/db-schemas/diagnostics";
import { DiagnosticsIdSchema } from "#/schemas/diagnostics";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const DiagnosticsIdInputSchema = object({ input: DiagnosticsIdSchema });

export const getOrder = Workflow.name("healthcare.diagnostics.get-order")
  .input(DiagnosticsIdInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DiagnosticsIdSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.id });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const results = await ctx.step.run("fetch-results", async () =>
      ctx.db
        .select()
        .from(healthcareLabResult)
        .where(
          and(
            eq(healthcareLabResult.branch_id, branchId),
            eq(healthcareLabResult.order_id, order.id),
          ),
        ),
    );

    const payload: Record<string, JsonValue> = order.payload;
    const rawDetail = payload.statusDetail;
    return {
      branchId: order.branch_id,
      createdAt: order.created_at.toISOString(),
      dx: order.dx,
      encounterId: order.encounter_id,
      id: order.id,
      isBilled: order.is_billed,
      orderNo: order.order_no,
      patientId: order.patient_id,
      payer: order.payer,
      payload,
      priority: order.priority,
      results: results.map((row) => ({
        enteredAt: row.entered_at.toISOString(),
        enteredBy: row.entered_by,
        flag: row.flag,
        testCode: row.test_code,
        value: row.value,
        version: row.version,
      })),
      status: order.status,
      statusDetail: is(string(), rawDetail) ? rawDetail : "ordered",
      updatedAt: order.updated_at.toISOString(),
    };
  });
