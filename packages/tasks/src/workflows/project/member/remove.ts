import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { projectMember } from "../../../db-schemas/project-member";
import { IdSchema } from "../../../types";

export const removeProjectMember = Workflow.name("project.remove-member")
  .input(object({ projectId: IdSchema, userId: IdSchema }))
  .handler(async ({ projectId, userId }, ctx) => {
    await ctx.db
      .delete(projectMember)
      .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)));
  });
