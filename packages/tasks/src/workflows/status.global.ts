import { Workflow } from "@aspen-os/platform/server";
import { asc, isNull } from "drizzle-orm";

import { status } from "../db-schemas/status";

export const getGlobalStatuses = Workflow.name("status.global").handler(
  async (_input: undefined, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(status)
        .where(isNull(status.projectId))
        .orderBy(asc(status.sortOrder));
    });
  },
);
