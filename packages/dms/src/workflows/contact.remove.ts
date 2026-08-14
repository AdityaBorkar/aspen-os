import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsContact, dmsShare } from "../db-schemas";
import { CONTACT_EVENTS } from "../pubsub";
import { IdSchema, RemoveContactSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchContactStep } from "./steps/fetch-contact";

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

    await ctx.step.run("mark-removed", async () => {
      await ctx.db
        .update(dmsContact)
        .set({
          deletionReason: reason,
          isRemoved: true,
          removedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dmsContact.id, id));
    });

    const revoked = await ctx.step.run("revoke-shares", async () => {
      const rows = await ctx.db
        .select({ id: dmsShare.id })
        .from(dmsShare)
        .where(eq(dmsShare.granteeId, id));

      if (rows.length > 0) {
        await ctx.db.delete(dmsShare).where(eq(dmsShare.granteeId, id));
      }
      return rows.length;
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
