import { department } from "#/db-schemas";
import { fetchDepartmentById } from "#/workflows/fetch";
import { buildDepartmentTree, getDepartmentCounts } from "#/workflows/trees";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, number, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  depth: optional(number()),
  id: pipe(string(), minLength(1, "id is required")),
});

export const getDepartmentSubtree = Workflow.name("hr.setup.get-department-subtree")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, depth } = input;

    await fetchDepartmentById(ctx.db, id);

    const [activeDepartments, counts] = await Promise.all([
      ctx.db.select().from(department).where(eq(department.isActive, true)),
      getDepartmentCounts(ctx.db),
    ]);

    return buildDepartmentTree(activeDepartments, counts, { depth, rootIds: new Set([id]) });
  });
