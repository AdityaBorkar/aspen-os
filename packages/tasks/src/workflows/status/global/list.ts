import { status } from "#/db-schemas/status";

import { Workflow } from "@aspen-os/platform/server";
import { asc, isNull } from "drizzle-orm";

export const getGlobalStatuses = Workflow.name("status.global").handler(
  async (_input: undefined, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(status).where(isNull(status.projectId)).orderBy(asc(status.sortOrder)),
    ),
);
