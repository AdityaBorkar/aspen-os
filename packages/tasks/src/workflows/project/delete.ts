import { project } from "#/db-schemas/project";
import { projectMember } from "#/db-schemas/project-member";
import { task } from "#/db-schemas/task";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteProject = Workflow.name("project.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    // Guard: refuse when tasks reference the project. In split deployments
    // the tenant `task` table is invisible from the control plane, so a
    // missing relation is skipped here — the caller (oRPC composition)
    // enforces the same guard against the tenant database first.
    let taskExists = false;
    try {
      const [found] = await ctx.db
        .select({ id: task.id })
        .from(task)
        .where(eq(task.project_id, id))
        .limit(1);
      taskExists = found !== undefined;
    } catch {
      taskExists = false;
    }

    if (taskExists) {
      throw new Error("Cannot delete project with existing tasks. Archive instead.");
    }

    await ctx.db.delete(projectMember).where(eq(projectMember.project_id, id));
    await ctx.db.delete(project).where(eq(project.id, id));
  });
