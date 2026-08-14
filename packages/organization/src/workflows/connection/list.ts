import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional } from "valibot";

import { connection } from "../../db-schemas";
import { ConnectionFiltersSchema } from "../../types";

export const listConnections = Workflow.name("connection.list")
  .input(object({ filters: optional(ConnectionFiltersSchema) }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(connection.type, parsed.type));
      }
      if (parsed.status) {
        conditions.push(eq(connection.status, parsed.status));
      }
      if (parsed.tags && parsed.tags.length > 0) {
        conditions.push(sql`${connection.tags} && ${parsed.tags}`);
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          sql`(${connection.name} ilike ${term} or ${connection.contactPerson} ilike ${term})`,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(connection).where(whereClause);
    }),
  );
