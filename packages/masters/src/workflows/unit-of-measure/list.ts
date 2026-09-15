import { masterUomAlias, masterUnitOfMeasure } from "#/db-schemas";
import { ListUnitsOfMeasureSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
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
        conditions.push(eq(masterUnitOfMeasure.is_active, parsed.isActive));
      }
      if (parsed.status) {
        conditions.push(eq(masterUnitOfMeasure.status, parsed.status));
      }
      if (parsed.search) {
        const needle = `%${parsed.search}%`;
        const textMatch = or(
          ilike(masterUnitOfMeasure.code, needle),
          ilike(masterUnitOfMeasure.name, needle),
          ilike(masterUnitOfMeasure.symbol, needle),
        );
        if (textMatch) {
          const aliasIds = ctx.db
            .select({ uom_id: masterUomAlias.uom_id })
            .from(masterUomAlias)
            .where(ilike(masterUomAlias.alias, needle));
          const aliasMatch = sql`${masterUnitOfMeasure.id} IN (${aliasIds})`;
          const combined = or(textMatch, aliasMatch);
          if (combined) {
            conditions.push(combined);
          }
        }
      }

      return ctx.db
        .select()
        .from(masterUnitOfMeasure)
        .where(and(...conditions))
        .orderBy(asc(masterUnitOfMeasure.category), asc(masterUnitOfMeasure.code))
        .limit(input.limit ?? 100)
        .offset(input.offset ?? 0);
    }),
  );
