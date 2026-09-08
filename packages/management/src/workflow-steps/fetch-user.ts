import { serviceProviderUser } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { user } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchUserStep = WorkflowStep.name("fetch-user")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select({
        createdAt: user.created_at,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
        spId: serviceProviderUser.service_provider_id,
        updatedAt: user.updated_at,
      })
      .from(user)
      .leftJoin(serviceProviderUser, eq(serviceProviderUser.user_id, user.id))
      .where(eq(user.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Platform user with id "${input.id}" not found.`);
    }

    return { ...result, spId: result.spId ?? null };
  });
