import { projectMember } from "#/db-schemas/project-member";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listProjectMembers = Workflow.name("project.list-members")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(projectMember).where(eq(projectMember.projectId, projectId)),
    ),
  );
