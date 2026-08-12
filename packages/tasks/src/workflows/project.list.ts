import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { project } from "../db-schemas/project";
import { ProjectFiltersSchema } from "../types";

export const listProjects = Workflow.name("project.list")
  .input(object({ filters: optional(ProjectFiltersSchema) }))
  .handler(async ({ filters }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [];

      if (filters?.leadId) {
        conditions.push(eq(project.leadId, filters.leadId));
      }
      if (filters?.status) {
        conditions.push(eq(project.status, filters.status));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(project)
        .where(whereClause)
        .orderBy(desc(project.createdAt));
    });
  });
