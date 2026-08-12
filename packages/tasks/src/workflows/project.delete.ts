import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { project } from "../db-schemas/project";
import { projectMember } from "../db-schemas/project-member";
import { task } from "../db-schemas/task";
import { IdSchema } from "../types";

export const deleteProject = Workflow.name("project.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    const [taskExists] = await ctx.db
      .select({ id: task.id })
      .from(task)
      .where(eq(task.projectId, id))
      .limit(1);

    if (taskExists) {
      throw new Error(
        "Cannot delete project with existing tasks. Archive instead.",
      );
    }

    await ctx.db.delete(projectMember).where(eq(projectMember.projectId, id));
    await ctx.db.delete(project).where(eq(project.id, id));
  });
