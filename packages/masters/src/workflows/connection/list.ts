import { masterConnection } from "#/db-schemas";
import { ListConnectionsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";

export const listConnections = Workflow.name("masters.connection.list")
  .input(ListConnectionsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [
        eq(masterConnection.entityType, input.entityType),
        eq(masterConnection.entityId, input.entityId),
      ];

      if (parsed.type) {
        conditions.push(eq(masterConnection.type, parsed.type));
      }
      if (parsed.status) {
        conditions.push(eq(masterConnection.status, parsed.status));
      }
      if (parsed.search) {
        const searchCondition = or(
          ilike(masterConnection.name, `%${parsed.search}%`),
          ilike(masterConnection.baseUrl, `%${parsed.search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      return ctx.db
        .select()
        .from(masterConnection)
        .where(and(...conditions));
    }),
  );
