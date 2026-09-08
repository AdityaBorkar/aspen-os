import { masterContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteContact = Workflow.name("masters.contact.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchContactStep, { id: input.id });

    await ctx.db.delete(masterContact).where(eq(masterContact.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
        metadata: { entity_id: current.entity_id, entity_type: current.entity_type },
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.REMOVED, {
        contactId: current.id,
        entityId: current.entity_id,
        entityType: current.entity_type,
      });
    });

    return { removed: true };
  });
