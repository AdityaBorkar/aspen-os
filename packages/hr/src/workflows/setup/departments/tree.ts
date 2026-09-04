import { department } from "#/db-schemas";
import { buildDepartmentTree, getDepartmentCounts } from "#/workflows/trees";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const InputSchema = object({});

export const getDepartmentTree = Workflow.name("hr.setup.get-department-tree")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    const [activeDepartments, counts] = await Promise.all([
      ctx.db.select().from(department).where(eq(department.isActive, true)),
      getDepartmentCounts(ctx.db),
    ]);

    return buildDepartmentTree(activeDepartments, counts);
  });
