import { project } from "#/db-schemas/project";
import { projectMember } from "#/db-schemas/project-member";
import { CreateProjectSchema } from "#/types";
import { ensureKeyUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateProjectSchema,
});

export const createProject = Workflow.name("project.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    await ensureKeyUnique(ctx.db, input.key, undefined);

    const [result] = await ctx.db
      .insert(project)
      .values({
        defaultTaskTypeId: input.defaultTaskTypeId ?? null,
        description: input.description ?? null,
        key: input.key,
        leadId: input.leadId,
        name: input.name,
        startDate: input.startDate ?? null,
        targetDate: input.targetDate ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create project.");
    }

    await ctx.db.insert(projectMember).values({
      projectId: result.id,
      role: "admin",
      userId: input.leadId,
    });

    return result;
  });
