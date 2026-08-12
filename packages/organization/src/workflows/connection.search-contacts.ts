import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { connectionContact } from "../db-schemas";

export const searchContacts = Workflow.name("connection.search-contacts")
  .input(
    object({
      connectionId: optional(string()),
      query: string(),
    }),
  )
  .handler(async (input, ctx) => {
    return ctx.step.run("query", async () => {
      const searchTerm = `%${input.query}%`;
      const conditions = [
        or(
          ilike(connectionContact.name, searchTerm),
          ilike(connectionContact.email, searchTerm),
        ),
      ];

      if (input.connectionId) {
        conditions.push(eq(connectionContact.connectionId, input.connectionId));
      }

      return ctx.db
        .select()
        .from(connectionContact)
        .where(and(...conditions));
    });
  });
