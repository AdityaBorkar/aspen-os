import { department } from "#/db-schemas";
import { SETUP_EVENTS } from "#/pubsub";
import { fetchDepartmentById, fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, nullable, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: optional(nullable(string())),
  id: pipe(string(), minLength(1, "id is required")),
});

export const setDepartmentHead = Workflow.name("hr.setup.set-department-head")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, employeeId } = input;

    await fetchDepartmentById(ctx.db, id);
    if (employeeId) {
      await fetchEmployeeById(ctx.db, employeeId);
    }

    const headEmployeeId = employeeId === undefined ? null : employeeId;

    const [updated] = await ctx.db
      .update(department)
      .set({ manager: headEmployeeId, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to set department head.");
    }

    await ctx.pubsub.publish(SETUP_EVENTS.DEPARTMENT_HEAD_CHANGED, {
      departmentId: id,
      headEmployeeId,
    });

    return updated;
  });
