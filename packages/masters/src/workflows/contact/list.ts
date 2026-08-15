import { masterContact } from "#/db-schemas";
import { ListContactsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";

export const listContacts = Workflow.name("masters.contact.list")
  .input(ListContactsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [
        eq(masterContact.entityType, input.entityType),
        eq(masterContact.entityId, input.entityId),
      ];

      if (parsed.type) {
        conditions.push(eq(masterContact.type, parsed.type));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(masterContact.isPrimary, parsed.isPrimary));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          sql`(${masterContact.name} ilike ${term} or ${masterContact.email} ilike ${term})`,
        );
      }

      return ctx.db
        .select()
        .from(masterContact)
        .where(and(...conditions));
    }),
  );
