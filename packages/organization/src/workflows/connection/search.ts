import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { connection } from "../../db-schemas";
import { ConnectionFiltersSchema } from "../../types";

export const searchConnections = Workflow.name("connection.search")
  .input(
    object({
      filters: optional(ConnectionFiltersSchema),
      query: string(),
    }),
  )
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const searchTerm = `%${input.query}%`;
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

      const searchCondition = or(
        ilike(connection.name, searchTerm),
        ilike(connection.contactPerson, searchTerm),
        sql`${connection.tags}::text ilike ${searchTerm}`,
      );

      const whereClause =
        conditions.length > 0 ? and(searchCondition, ...conditions) : searchCondition;

      return ctx.db.select().from(connection).where(whereClause);
    }),
  );
