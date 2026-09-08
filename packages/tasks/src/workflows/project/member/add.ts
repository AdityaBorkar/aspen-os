import { projectMember } from "#/db-schemas/project-member";
import { CreateProjectMemberSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateProjectMemberSchema,
});

export const addProjectMember = Workflow.name("project.add-member")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [existing] = await ctx.db
      .select({ userId: projectMember.user_id })
      .from(projectMember)
      .where(
        and(eq(projectMember.project_id, input.projectId), eq(projectMember.user_id, input.userId)),
      )
      .limit(1);

    if (existing) {
      throw new Error("User is already a member of this project.");
    }

    const [result] = await ctx.db
      .insert(projectMember)
      .values({
        project_id: input.projectId,
        role: input.role ?? "member",
        user_id: input.userId,
      })
      .returning();

    return result;
  });
