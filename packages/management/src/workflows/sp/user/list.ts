import { serviceProviderUser } from "#/db-schemas";
import { IdSchema, LimitSchema, OffsetSchema } from "#/types";
import { requireServiceProvider } from "#/utils/require-sp";

import { Workflow } from "@aspen-os/platform/server";
import { user } from "@aspen-os/platform/server/db-schemas";
import { asc, eq } from "drizzle-orm";
import { object } from "valibot";

export const listSpUsers = Workflow.name("sp.users")
  .input(
    object({
      limit: LimitSchema,
      offset: OffsetSchema,
      spId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { spId } = input;

    await requireServiceProvider(ctx, spId);

    return ctx.step.run("query", async () =>
      ctx.db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
          spId: serviceProviderUser.serviceProviderId,
          updatedAt: user.updatedAt,
        })
        .from(serviceProviderUser)
        .innerJoin(user, eq(serviceProviderUser.userId, user.id))
        .where(eq(serviceProviderUser.serviceProviderId, spId))
        .orderBy(asc(user.name))
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0),
    );
  });
