import { connectionContact } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const listContacts = Workflow.name("connection.list-contacts")
  .input(object({ connectionId: string() }))
  .handler(async (input, ctx) =>
    ctx.db
      .select()
      .from(connectionContact)
      .where(eq(connectionContact.connectionId, input.connectionId)),
  );
