import { Workflow } from "@aspen-os/platform/server";
import { and, eq, type SQL } from "drizzle-orm";
import { object, optional } from "valibot";

import { user } from "../db-schemas";
import { PlatformUserFiltersSchema } from "../types";

export const listUsers = Workflow.name("user.list")
  .input(
    object({
      filters: optional(PlatformUserFiltersSchema),
    }),
  )
  .handler(async (input, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.role) {
        conditions.push(eq(user.role, parsed.role));
      }
      if (parsed.spId) {
        conditions.push(eq(user.spId, parsed.spId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
          spId: user.spId,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(whereClause);
    });
  });
