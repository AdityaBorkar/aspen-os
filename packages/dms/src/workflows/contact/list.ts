import { dmsContact } from "#/db-schemas";
import { ContactFiltersSchema } from "#/types";
import type { ContactFilters } from "#/types";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional } from "valibot";

export const getContact = Workflow.name("dms.contact.get").handler(
  async (input: { id: string }, ctx) => ctx.step.run(fetchContactStep, { id: input.id }),
);

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

export const listContacts = Workflow.name("dms.contact.list")
  .input(object({ filters: optional(ContactFiltersSchema) }))
  .handler(async (input: { filters?: ContactFilters }, ctx) => {
    const conditions: SQL[] = [];
    const isRemoved = coerceIsRemoved(input.filters?.isRemoved);
    if (isRemoved === undefined) {
      conditions.push(eq(dmsContact.isRemoved, false));
    } else {
      conditions.push(eq(dmsContact.isRemoved, isRemoved));
    }
    if (input.filters?.search) {
      const term = `%${input.filters.search}%`;
      const searchCondition = or(
        ilike(dmsContact.firstName, term),
        ilike(dmsContact.lastName, term),
        ilike(dmsContact.email, term),
        ilike(dmsContact.companyName, term),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    return ctx.db
      .select()
      .from(dmsContact)
      .where(and(...conditions))
      .orderBy(dmsContact.lastName);
  });
