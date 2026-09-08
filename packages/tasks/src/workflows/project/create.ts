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
    await ensureKeyUnique(ctx.db, input.key);

    const [result] = await ctx.db
      .insert(project)
      .values({
        default_task_type_id: input.defaultTaskTypeId ?? null,
        description: input.description ?? null,
        key: input.key,
        lead_id: input.leadId,
        name: input.name,
        start_date: input.startDate ?? null,
        target_date: input.targetDate ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create project.");
    }

    await ctx.db.insert(projectMember).values({
      project_id: result.id,
      role: "admin",
      user_id: input.leadId,
    });

    return result;
  });
