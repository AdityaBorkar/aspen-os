import { department } from "#/db-schemas";
import { SETUP_EVENTS } from "#/pubsub";
import { fetchDepartmentById, validateParentDepartment } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, nullable, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  newParentId: optional(nullable(string())),
});

export const moveDepartment = Workflow.name("hr.setup.move-department")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, newParentId } = input;

    const existing = await fetchDepartmentById(ctx.db, id);

    if (newParentId !== null && newParentId !== undefined) {
      if (newParentId === id) {
        throw new Error("A department cannot be its own parent.");
      }
      await validateParentDepartment(ctx.db, newParentId, id);
    }

    const parentDepartment = newParentId === undefined ? existing.parentDepartment : newParentId;

    const [updated] = await ctx.db
      .update(department)
      .set({ parentDepartment, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to move department.");
    }

    await ctx.pubsub.publish(SETUP_EVENTS.DEPARTMENT_MOVED, {
      departmentId: id,
      fromParentId: existing.parentDepartment,
      toParentId: parentDepartment,
    });

    return updated;
  });
