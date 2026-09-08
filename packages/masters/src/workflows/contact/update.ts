import { masterContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { UpdateContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

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

    const updates = stripUndefined({
      company: input.patch.company,
      email: input.patch.email,
      first_name: input.patch.firstName,
      last_name: input.patch.lastName,
      linked_user_id: input.patch.linkedUserId,
      metadata: input.patch.metadata,
      name: input.patch.name,
      phone: input.patch.phone,
      title: input.patch.title,
      type: input.patch.type,
    });

    // Keep the display name in sync when only the split name changes.
    const derivedName =
      updates.name ??
      (updates.first_name !== undefined || updates.last_name !== undefined
        ? `${updates.first_name ?? current.first_name ?? ""} ${updates.last_name ?? current.last_name ?? ""}`.trim()
        : undefined);
    const finalUpdates = stripUndefined({ ...updates, name: derivedName });

    const [updated] = await ctx.db
      .update(masterContact)
      .set({ ...finalUpdates, updated_at: new Date() })
      .where(eq(masterContact.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Contact with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: finalUpdates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.UPDATED, {
        changes: finalUpdates,
        contact: { id: updated.id, name: updated.name },
        entityType: updated.entity_type,
      });
    });

    return updated;
  });
