import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";

import { dmsContact } from "../db-schemas";
import { fetchContactStep } from "./steps/fetch-contact";

export const getContact = Workflow.name("dms.contact.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchContactStep, { id: input.id });
  },
);

export const listContacts = Workflow.name("dms.contact.list").handler(
  async (input: { filters?: { isRemoved?: string; search?: string } }, ctx) => {
    const conditions: SQL[] = [];
    if (input.filters?.isRemoved !== undefined) {
      conditions.push(
        eq(dmsContact.isRemoved, input.filters.isRemoved === "true"),
      );
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
