import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { projectMember } from "../db-schemas/project-member";
import { CreateProjectMemberSchema } from "../types";

const CreateInputSchema = object({
  input: CreateProjectMemberSchema,
});

export const addProjectMember = Workflow.name("project.add-member")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [existing] = await ctx.db
      .select({ userId: projectMember.userId })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, input.projectId),
          eq(projectMember.userId, input.userId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("User is already a member of this project.");
    }

    const [result] = await ctx.db
      .insert(projectMember)
      .values({
        projectId: input.projectId,
        role: input.role ?? "member",
        userId: input.userId,
      })
      .returning();

    return result;
  });
