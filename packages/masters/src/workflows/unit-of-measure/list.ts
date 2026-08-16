import { masterUnitOfMeasure } from "#/db-schemas";
import { ListUnitsOfMeasureSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listUnitsOfMeasure = Workflow.name("masters.unit-of-measure.list")
  .input(ListUnitsOfMeasureSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.category) {
        conditions.push(eq(masterUnitOfMeasure.category, parsed.category));
      }
      if (parsed.isActive !== undefined) {
        conditions.push(eq(masterUnitOfMeasure.isActive, parsed.isActive));
      }

      return ctx.db
        .select()
        .from(masterUnitOfMeasure)
        .where(and(...conditions))
        .orderBy(asc(masterUnitOfMeasure.category), asc(masterUnitOfMeasure.code));
    }),
  );
