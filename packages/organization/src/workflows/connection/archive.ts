import { connection } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const archiveConnection = Workflow.name("connection.archive")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(connection)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    return updated;
  });
