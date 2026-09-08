import { masterContact } from "#/db-schemas";
import { ListContactsSchema } from "#/types";
import type { ContactFilters } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

type IsRemovedFilter = ContactFilters["isRemoved"] | string | null;

function coerceIsRemoved(value: IsRemovedFilter): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return value.toLowerCase() === "true";
}

export const listContacts = Workflow.name("masters.contact.list")
  .input(ListContactsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (input.entityType !== undefined) {
        conditions.push(eq(masterContact.entity_type, input.entityType));
      }
      if (input.entityId !== undefined) {
        conditions.push(eq(masterContact.entity_id, input.entityId));
      }

      const isRemoved = coerceIsRemoved(parsed.isRemoved);
      conditions.push(eq(masterContact.is_removed, isRemoved ?? false));

      if (parsed.type) {
        conditions.push(eq(masterContact.type, parsed.type));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          sql`(${masterContact.name} ilike ${term} or ${masterContact.first_name} ilike ${term} or ${masterContact.last_name} ilike ${term} or ${masterContact.email} ilike ${term} or ${masterContact.company} ilike ${term})`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(masterContact).where(where).orderBy(masterContact.name);
    }),
  );
