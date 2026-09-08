import { masterContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { RemoveContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const RemoveInputSchema = object({ id: string(), input: RemoveContactSchema });

export const removeContact = Workflow.name("masters.contact.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const contact = await ctx.step.run(fetchContactStep, { id });
    const { reason } = input;

    if (contact.is_removed) {
      throw new Error(`Contact "${id}" is already removed.`);
    }

    const [removed] = await ctx.db
      .update(masterContact)
      .set({
        deletion_reason: reason,
        is_removed: true,
        removed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(masterContact.id, id))
      .returning();

    if (!removed) {
      throw new Error(`Contact with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
        metadata: { reason },
      });

      // DMS subscribes to this topic and revokes every share granted to the
      // contact, so external (token) access is invalidated immediately.
      await ctx.pubsub.publish(CONTACT_EVENTS.REMOVED, {
        contactId: id,
        entityId: contact.entity_id,
        entityType: contact.entity_type,
        reason,
      });
    });

    return { contactId: id };
  });
