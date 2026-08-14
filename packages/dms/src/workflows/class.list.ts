import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, type SQL } from "drizzle-orm";
import { object } from "valibot";

import { dmsClass } from "../db-schemas";
import { ClassFiltersSchema } from "../types";

const ListInputSchema = object({ filters: ClassFiltersSchema });

export const listClasses = Workflow.name("dms.class.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (filters.activeOnly) {
        conditions.push(eq(dmsClass.isActive, true));
      }
      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push(ilike(dmsClass.name, term));
      }

      return ctx.db
        .select()
        .from(dmsClass)
        .where(and(...conditions))
        .orderBy(dmsClass.name);
    }),
  );
