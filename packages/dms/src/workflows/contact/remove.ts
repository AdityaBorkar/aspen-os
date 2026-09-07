import { dmsContact, dmsShare } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { IdSchema, RemoveContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema, input: RemoveContactSchema });

export const removeContact = Workflow.name("dms.contact.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const contact = await ctx.step.run(fetchContactStep, { id });
    const { reason } = input;

    if (!reason || reason.trim().length === 0) {
      throw new Error("Deletion reason is required to remove a contact.");
    }
    if (contact.isRemoved) {
      throw new Error(`Contact "${id}" is already removed.`);
    }

    const revoked = await ctx.db.transaction(async (tx) => {
      await tx
        .update(dmsContact)
        .set({
          deletionReason: reason,
          isRemoved: true,
          removedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dmsContact.id, id));

      const deleted = await tx
        .delete(dmsShare)
        .where(and(eq(dmsShare.granteeId, id), eq(dmsShare.granteeType, "contact")))
        .returning({ id: dmsShare.id });
      return deleted.length;
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CONTACT_REMOVED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
        metadata: { reason, revokedShareCount: revoked },
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.REMOVED, {
        contactId: id,
        reason,
      });
    });

    return { contactId: id, revokedShareCount: revoked };
  });
