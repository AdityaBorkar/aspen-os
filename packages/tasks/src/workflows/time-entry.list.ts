import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { timeEntry } from "../db-schemas/time-entry";
import { TimeEntryFiltersSchema } from "../types";

export const listTimeEntries = Workflow.name("time-entry.list")
  .input(object({ filters: optional(TimeEntryFiltersSchema) }))
  .handler(async ({ filters }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [];

      if (filters?.taskId)
        conditions.push(eq(timeEntry.taskId, filters.taskId));
      if (filters?.userId)
        conditions.push(eq(timeEntry.userId, filters.userId));
      if (filters?.billable !== undefined) {
        conditions.push(eq(timeEntry.billable, filters.billable));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(timeEntry)
        .where(whereClause)
        .orderBy(desc(timeEntry.date));
    });
  });
