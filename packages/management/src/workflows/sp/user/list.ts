import { serviceProviderUser } from "#/db-schemas";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { user } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const getUsers = Workflow.name("sp.users")
  .input(object({ spId: IdSchema }))
  .handler(async (input, ctx) => {
    const { spId } = input;

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
        .where(eq(serviceProviderUser.serviceProviderId, spId)),
    );
  });
