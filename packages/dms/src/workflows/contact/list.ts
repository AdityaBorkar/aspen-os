import { dmsContact } from "#/db-schemas";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getContact = Workflow.name("dms.contact.get").handler(
  async (input: { id: string }, ctx) => ctx.step.run(fetchContactStep, { id: input.id }),
);

export const listContacts = Workflow.name("dms.contact.list").handler(
  async (input: { filters?: { isRemoved?: string; search?: string } }, ctx) => {
    const conditions: SQL[] = [];
    if (input.filters?.isRemoved !== undefined) {
      conditions.push(eq(dmsContact.isRemoved, input.filters.isRemoved === "true"));
    } else {
      conditions.push(eq(dmsContact.isRemoved, false));
    }
    if (input.filters?.search) {
      const term = `%${input.filters.search}%`;
      conditions.push(
        or(
          ilike(dmsContact.firstName, term),
          ilike(dmsContact.lastName, term),
          ilike(dmsContact.email, term),
          ilike(dmsContact.companyName, term),
        ) as SQL,
      );
    }

    return ctx.db
      .select()
      .from(dmsContact)
      .where(and(...conditions))
      .orderBy(dmsContact.lastName);
  },
);
