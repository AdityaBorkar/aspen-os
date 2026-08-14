import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { status } from "../db-schemas/status";
import { IdSchema } from "../types";

export const listStatuses = Workflow.name("status.list")
  .input(object({ projectId: optional(IdSchema) }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = projectId ? eq(status.projectId, projectId) : undefined;
      return ctx.db.select().from(status).where(conditions).orderBy(asc(status.sortOrder));
    }),
  );
