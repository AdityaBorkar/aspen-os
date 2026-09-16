import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DiagnosticsIdSchema } from "#/schemas/diagnostics";
import { boardBranchOf, boardLimitOf, diagnosticsPriorityOf } from "#/workflows/shared/board-query";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const QueueInputSchema = object({ input: DiagnosticsIdSchema });

export const queue = Workflow.name("healthcare.diagnostics.queue")
  .input(QueueInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DiagnosticsIdSchema, input);
    const branchId = boardBranchOf(parsed.branchId);

    const rows = await ctx.step.run("fetch-queue", async () =>
      ctx.db
        .select()
        .from(healthcareLabOrder)
        .where(eq(healthcareLabOrder.branch_id, branchId))
        .limit(boardLimitOf(undefined, 200, 500)),
    );
    return rows
      .toSorted(
        (left, right) =>
          diagnosticsPriorityOf(left.priority) - diagnosticsPriorityOf(right.priority) ||
          left.created_at.getTime() - right.created_at.getTime(),
      )
      .map((row) => {
        const rawDetail = row.payload.statusDetail;
        return {
          createdAt: row.created_at.toISOString(),
          id: row.id,
          orderNo: row.order_no,
          patientId: row.patient_id,
          priority: row.priority,
          status: row.status,
          statusDetail: is(string(), rawDetail) ? rawDetail : "ordered",
        };
      });
  });
