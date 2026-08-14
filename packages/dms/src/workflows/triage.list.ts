import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocument } from "../db-schemas";
import { TriageFiltersSchema } from "../types";

const TriageListInputSchema = object({
  filters: TriageFiltersSchema,
});

export const listTriage = Workflow.name("dms.triage.list")
  .input(TriageListInputSchema)
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [eq(dmsDocument.status, "triaged")];

      if (filters.ownerId) {
        conditions.push(eq(dmsDocument.ownerId, filters.ownerId));
      }
      if (filters.batchId) {
        conditions.push(eq(dmsDocument.batchId, filters.batchId));
      }
      if (filters.classId) {
        conditions.push(eq(dmsDocument.classId, filters.classId));
      }
      if (filters.tag) {
        conditions.push(sql`${dmsDocument.tags} ? ${filters.tag}`);
      }
      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push(
          or(ilike(dmsDocument.name, term), ilike(dmsDocument.docNumber, term)) as SQL,
        );
      }

      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      return ctx.db
        .select()
        .from(dmsDocument)
        .where(and(...conditions))
        .orderBy(desc(dmsDocument.createdAt))
        .limit(limit)
        .offset(offset);
    }),
  );
