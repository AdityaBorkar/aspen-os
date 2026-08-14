import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { connectionContact } from "../../../db-schemas";
import { unsetPrimaryContacts } from "../../utils";

export const setPrimaryContact = Workflow.name("contact.set-primary")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [contact] = await ctx.db
      .select({ connectionId: connectionContact.connectionId })
      .from(connectionContact)
      .where(eq(connectionContact.id, input.id))
      .limit(1);

    if (!contact) {
      throw new Error(`Contact with id "${input.id}" not found.`);
    }

    await unsetPrimaryContacts(ctx.db, contact.connectionId);

    const [updated] = await ctx.db
      .update(connectionContact)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(connectionContact.id, input.id))
      .returning();

    return updated;
  });
