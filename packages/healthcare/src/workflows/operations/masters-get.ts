import { healthcareMasterEntry } from "#/db-schemas/operations";
import { MasterFiltersSchema } from "#/schemas/operations";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MastersGetInputSchema = object({ input: MasterFiltersSchema });

export const mastersGet = Workflow.name("healthcare.operations.masters-get")
  .input(MastersGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MasterFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const filters = [eq(healthcareMasterEntry.branch_id, branchId)];
    if (parsed.domain) {
      filters.push(eq(healthcareMasterEntry.domain, parsed.domain));
    }
    const rows = await ctx.step.run("load-masters", async () =>
      ctx.db
        .select()
        .from(healthcareMasterEntry)
        .where(and(...filters))
        .orderBy(desc(healthcareMasterEntry.updated_at))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => ({
      domain: row.domain,
      id: row.id,
      key: row.key,
      value: row.value,
      version: row.version,
    }));
  });
