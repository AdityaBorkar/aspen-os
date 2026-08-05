import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { user } from "../db-schemas";
import { IdSchema } from "../types";

export const getUsers = Workflow.name("sp.users")
  .input(object({ spId: IdSchema }))
  .handler(async (input, ctx) => {
    const { spId } = input;

    return ctx.step.run("query", async () => {
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
        .where(eq(user.spId, spId));
    });
  });
