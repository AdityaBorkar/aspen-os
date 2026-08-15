import { masterContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { UpdateContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";
import { unsetPrimaryContacts } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateContactSchema,
});

export const updateContact = Workflow.name("masters.contact.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchContactStep, { id: input.id });

    if (input.patch.isPrimary === true) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryContacts(ctx.db, current.entityType, current.entityId),
      );
    }

    const [updated] = await ctx.db
      .update(masterContact)
      .set({
        company: input.patch.company,
        email: input.patch.email,
        isPrimary: input.patch.isPrimary,
        metadata: input.patch.metadata,
        name: input.patch.name,
        phone: input.patch.phone,
        title: input.patch.title,
        type: input.patch.type,
        updatedAt: new Date(),
      })
      .where(eq(masterContact.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Contact with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.UPDATED, {
        changes: input.patch,
        contact: { id: updated.id, name: updated.name },
        entityType: updated.entityType,
      });
    });

    return updated;
  });
