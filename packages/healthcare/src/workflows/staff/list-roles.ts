import { healthcareStaffRole } from "#/db-schemas/staff";
import { RoleFiltersSchema } from "#/schemas/staff";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListRolesInputSchema = object({ input: RoleFiltersSchema });

export const listRoles = Workflow.name("healthcare.staff.list-roles")
  .input(ListRolesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RoleFiltersSchema, input);
    const rows = await ctx.step.run("list-roles", async () =>
      ctx.db
        .select()
        .from(healthcareStaffRole)
        .where(eq(healthcareStaffRole.branch_id, parsed.branchId ?? "main"))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => ({ id: row.id, name: row.name, permissions: row.permissions }));
  });
