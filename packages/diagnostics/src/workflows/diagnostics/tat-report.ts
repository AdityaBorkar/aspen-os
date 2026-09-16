import { healthcareLabOrder, healthcareLabResult } from "#/db-schemas/diagnostics";
import { TatReportSchema } from "#/schemas/diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const TatReportInputSchema = object({ input: TatReportSchema });

export const tatReport = Workflow.name("diagnostics.tat-report")
  .input(TatReportInputSchema)
  .handler(async ({ input }, ctx) => {
    // TAT computation stays clinical; rendering/export lives on the shared
    // reporting surface (workspace, interim; reports when real).
    const parsed = parse(TatReportSchema, input);
    const branchId = parsed.branchId ?? "main";
    const limit = Math.min(parsed.limit ?? 200, 1000);

    const conditions = [eq(healthcareLabOrder.branch_id, branchId)];
    if (parsed.from) {
      conditions.push(gte(healthcareLabOrder.created_at, new Date(parsed.from)));
    }
    if (parsed.to) {
      conditions.push(lte(healthcareLabOrder.created_at, new Date(parsed.to)));
    }
    const orders = await ctx.step.run("load-orders", async () =>
      ctx.db
        .select()
        .from(healthcareLabOrder)
        .where(and(...conditions))
        .orderBy(desc(healthcareLabOrder.created_at))
        .limit(limit),
    );
    const results = await ctx.step.run("load-results", async () =>
      ctx.db
        .select()
        .from(healthcareLabResult)
        .where(eq(healthcareLabResult.branch_id, branchId))
        .limit(5000),
    );
    const firstResultAt = new Map<string, number>();
    for (const result of results) {
      const at = result.entered_at.getTime();
      const prev = firstResultAt.get(result.order_id);
      if (prev === undefined || at < prev) {
        firstResultAt.set(result.order_id, at);
      }
    }

    const rows = [];
    let authorizedCount = 0;
    let tatSumHrs = 0;
    for (const order of orders) {
      const rawAuth = order.payload.authorizedAt;
      const authorizedAt = is(string(), rawAuth) ? rawAuth : null;
      const end = authorizedAt ?? firstResultAt.get(order.id);
      const tatHrs =
        end === undefined || end === null
          ? null
          : (new Date(end).getTime() - order.created_at.getTime()) / 3_600_000;
      if (tatHrs !== null) {
        authorizedCount += 1;
        tatSumHrs += tatHrs;
      }
      const rawTests = order.payload.testCodes;
      rows.push({
        authorizedAt,
        orderId: order.id,
        orderNo: order.order_no,
        orderedAt: order.created_at.toISOString(),
        patientId: order.patient_id,
        priority: order.priority,
        status: order.status,
        tatHrs: tatHrs === null ? null : Math.round(tatHrs * 10) / 10,
        tests: Array.isArray(rawTests) ? rawTests.length : 0,
      });
    }
    return {
      avgTatHrs: authorizedCount === 0 ? null : Math.round((tatSumHrs / authorizedCount) * 10) / 10,
      orders: orders.length,
      reported: authorizedCount,
      rows,
    };
  });
