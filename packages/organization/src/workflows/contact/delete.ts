import { connectionContact } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const deleteContact = Workflow.name("connection.delete-contact")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    await ctx.db.delete(connectionContact).where(eq(connectionContact.id, input.id));
  });
