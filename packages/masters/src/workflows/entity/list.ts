import { masterEntity } from "#/db-schemas";
import { ListEntitiesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listEntities = Workflow.name("masters.entity.list")
  .input(ListEntitiesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.type) {
        conditions.push(eq(masterEntity.type, parsed.type));
      }
      if (parsed.status) {
        conditions.push(eq(masterEntity.status, parsed.status));
      }
      if (parsed.organizationId) {
        conditions.push(eq(masterEntity.organizationId, parsed.organizationId));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          sql`(${masterEntity.name} ilike ${term} or ${masterEntity.code} ilike ${term} or ${masterEntity.registrationNumber} ilike ${term})`,
        );
      }

      const query = ctx.db
        .select()
        .from(masterEntity)
        .where(and(...conditions))
        .orderBy(asc(masterEntity.name));

      if (parsed.limit !== undefined) {
        query.limit(parsed.limit);
      }
      if (parsed.offset !== undefined) {
        query.offset(parsed.offset);
      }

      return query;
    }),
  );
