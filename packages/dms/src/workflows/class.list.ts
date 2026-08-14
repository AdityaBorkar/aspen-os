import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, type SQL } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocumentClass } from "../db-schemas";
import { ClassFiltersSchema } from "../types";

const ListInputSchema = object({ filters: ClassFiltersSchema });

export const listClasses = Workflow.name("dms.class.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (filters.activeOnly) {
        conditions.push(eq(dmsDocumentClass.isActive, true));
      }
      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push(ilike(dmsDocumentClass.name, term));
      }

      return ctx.db
        .select()
        .from(dmsDocumentClass)
        .where(and(...conditions))
        .orderBy(dmsDocumentClass.name);
    }),
  );
