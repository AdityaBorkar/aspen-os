import { healthcareMasterVersion } from "#/db-schemas/admin";
import { MasterVersionFiltersSchema } from "#/schemas/admin";
import { toMasterVersionDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListMasterVersionsInputSchema = object({
  input: MasterVersionFiltersSchema,
});

export const listMasterVersions = Workflow.name("healthcare.admin.list-master-versions")
  .input(ListMasterVersionsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MasterVersionFiltersSchema, input);
    const rows = await ctx.step.run("list-master-versions", async () => {
      const conditions: SQL[] = [];
      if (parsed.branchId) {
        conditions.push(eq(healthcareMasterVersion.branch_id, parsed.branchId));
      }
      if (parsed.domain) {
        conditions.push(eq(healthcareMasterVersion.domain, parsed.domain));
      }
      const base = ctx.db.select().from(healthcareMasterVersion);
      if (conditions.length > 0) {
        return base
          .where(and(...conditions))
          .orderBy(desc(healthcareMasterVersion.created_at))
          .limit(parsed.limit ?? 100)
          .offset(parsed.offset ?? 0);
      }
      return base
        .orderBy(desc(healthcareMasterVersion.created_at))
        .limit(parsed.limit ?? 100)
        .offset(parsed.offset ?? 0);
    });
    return rows.map(toMasterVersionDto);
  });
