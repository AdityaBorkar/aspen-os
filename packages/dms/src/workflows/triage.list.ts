import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { object } from "valibot";

import { dmsFile } from "../db-schemas";
import { TriageFiltersSchema } from "../types";

const TriageListInputSchema = object({
  filters: TriageFiltersSchema,
});

export const listTriage = Workflow.name("dms.triage.list")
  .input(TriageListInputSchema)
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [eq(dmsFile.status, "triaged")];

      if (filters.ownerId) {
        conditions.push(eq(dmsFile.ownerId, filters.ownerId));
      }
      if (filters.batchId) {
        conditions.push(eq(dmsFile.batchId, filters.batchId));
      }
      if (filters.classId) {
        conditions.push(eq(dmsFile.classId, filters.classId));
      }
      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push(or(ilike(dmsFile.name, term), ilike(dmsFile.docNumber, term)) as SQL);
      }

      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      return ctx.db
        .select()
        .from(dmsFile)
        .where(and(...conditions))
        .orderBy(desc(dmsFile.createdAt))
        .limit(limit)
        .offset(offset);
    }),
  );
