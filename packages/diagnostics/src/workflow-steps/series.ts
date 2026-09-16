import { healthcareCounter } from "#/db-schemas/counter";

import { WorkflowStep } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { object, string } from "valibot";

const NextSeriesInputSchema = object({ input: object({ series: string() }) });

export const nextHealthcareSeries = WorkflowStep.name("diagnostics-next-series")
  .input(NextSeriesInputSchema)
  .handler(async ({ input }, ctx) => {
    const [row] = await ctx.db
      .insert(healthcareCounter)
      .values({ last_no: 1, series: input.series })
      .onConflictDoUpdate({
        set: { last_no: sql`${healthcareCounter.last_no} + 1` },
        target: healthcareCounter.series,
      })
      .returning({ last_no: healthcareCounter.last_no });
    if (!row) {
      throw new Error(`Failed to advance healthcare series "${input.series}".`);
    }
    return row.last_no;
  });
