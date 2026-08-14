import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { connectionContact } from "../../../db-schemas";
import { UpdateConnectionContactSchema } from "../../../types";
import { unsetPrimaryContacts } from "../../utils";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateConnectionContactSchema,
});

export const updateContact = Workflow.name("connection.update-contact")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    if (input.patch.isPrimary === true) {
      const [contact] = await ctx.db
        .select({ connectionId: connectionContact.connectionId })
        .from(connectionContact)
        .where(eq(connectionContact.id, input.id))
        .limit(1);

      if (contact) {
        await unsetPrimaryContacts(ctx.db, contact.connectionId);
      }
    }

    const [updated] = await ctx.db
      .update(connectionContact)
      .set({ ...input.patch, updatedAt: new Date() })
      .where(eq(connectionContact.id, input.id))
      .returning();

    return updated;
  });
