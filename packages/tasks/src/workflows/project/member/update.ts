import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { projectMember } from "../../../db-schemas/project-member";
import { IdSchema, UpdateProjectMemberSchema } from "../../../types";

const UpdateInputSchema = object({
  patch: UpdateProjectMemberSchema,
  projectId: IdSchema,
  userId: IdSchema,
});

export const updateProjectMember = Workflow.name("project.update-member")
  .input(UpdateInputSchema)
  .handler(async ({ projectId, userId, patch }, ctx) => {
    const [updated] = await ctx.db
      .update(projectMember)
      .set({ role: patch.role })
      .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Project member not found.");
    }

    return updated;
  });
