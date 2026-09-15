import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DiagnosticsIdSchema } from "#/schemas/diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const QueueInputSchema = object({ input: DiagnosticsIdSchema });

type PriorityRank = Record<string, number>;

const PRIORITY_RANK: PriorityRank = { routine: 2, stat: 0, urgent: 1 };

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
    return [...rows]
      .sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) ||
          a.created_at.getTime() - b.created_at.getTime(),
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
