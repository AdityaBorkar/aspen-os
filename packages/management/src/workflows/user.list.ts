import { Workflow } from "@aspen-os/platform/server";
import { user } from "@aspen-os/platform/server/db-schemas";
import { and, eq, type SQL } from "drizzle-orm";
import { object, optional } from "valibot";

import { serviceProviderUser } from "../db-schemas";
import { PlatformUserFiltersSchema } from "../types";

export const listUsers = Workflow.name("user.list")
  .input(
    object({
      filters: optional(PlatformUserFiltersSchema),
    }),
  )
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.role) {
        conditions.push(eq(user.role, parsed.role));
      }
      if (parsed.spId) {
        conditions.push(eq(serviceProviderUser.serviceProviderId, parsed.spId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
          spId: serviceProviderUser.serviceProviderId,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .leftJoin(serviceProviderUser, eq(serviceProviderUser.userId, user.id))
        .where(whereClause);
    }),
  );
