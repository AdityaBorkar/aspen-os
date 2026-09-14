import { healthcarePrescription } from "#/db-schemas/encounters";
import { RecentRxQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RecentRxInputSchema = object({ input: RecentRxQuerySchema });

export const recentlyUsedRx = Workflow.name("healthcare.records.recently-used-rx")
  .input(RecentRxInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecentRxQuerySchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("load-prescriptions", async () =>
      ctx.db
        .select()
        .from(healthcarePrescription)
        .where(
          and(
            eq(healthcarePrescription.branch_id, branchId),
            eq(healthcarePrescription.patient_id, parsed.patientId),
          ),
        )
        .orderBy(desc(healthcarePrescription.created_at))
        .limit(parsed.limit ?? 10),
    );

    const seen = new Set<string>();
    const items: { item: unknown; lastUsedAt: string }[] = [];
    for (const row of rows) {
      const raw = row.payload.items;
      const list = Array.isArray(raw) ? raw : [];
      for (const item of list) {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ item, lastUsedAt: row.created_at.toISOString() });
        }
      }
    }
    return { items, patientId: parsed.patientId };
  });
