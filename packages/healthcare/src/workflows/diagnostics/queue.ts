import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DiagnosticsIdSchema } from "#/schemas/diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const QueueInputSchema = object({ input: DiagnosticsIdSchema });

const PRIORITY_RANK = { routine: 2, stat: 0, urgent: 1 } satisfies Record<string, number>;

export const queue = Workflow.name("healthcare.diagnostics.queue")
  .input(QueueInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DiagnosticsIdSchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("fetch-queue", async () =>
      ctx.db
        .select()
        .from(healthcareLabOrder)
        .where(eq(healthcareLabOrder.branch_id, branchId))
        .limit(200),
    );
    return rows
      .toSorted(
        (left, right) =>
          // SAFETY: priority is free-form text; narrowing to known keys is safe because unknown values fall back to 3.
          (PRIORITY_RANK[left.priority as keyof typeof PRIORITY_RANK] ?? 3) -
            // SAFETY: priority is free-form text; narrowing to known keys is safe because unknown values fall back to 3.
            (PRIORITY_RANK[right.priority as keyof typeof PRIORITY_RANK] ?? 3) ||
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
