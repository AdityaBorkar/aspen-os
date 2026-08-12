import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { connectionContact } from "../db-schemas";

export const listContacts = Workflow.name("connection.list-contacts")
  .input(object({ connectionId: string() }))
  .handler(async (input, ctx) => {
    return ctx.db
      .select()
      .from(connectionContact)
      .where(eq(connectionContact.connectionId, input.connectionId));
  });
