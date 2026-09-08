import { orgBranch } from "#/db-schemas";
import { OrgBranchFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listOrgBranches = Workflow.name("masters.org_branch.list")
  .input(object({ filters: optional(OrgBranchFiltersSchema) }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(orgBranch.type, parsed.type));
      }
      if (parsed.parentOrgBranch) {
        conditions.push(eq(orgBranch.parent_org_branch, parsed.parentOrgBranch));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(orgBranch).where(whereClause);
    }),
  );

// Deprecated alias — prefer listOrgBranches.
export const listBranches = listOrgBranches;
