import { masterContact } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";
import { unsetPrimaryContacts } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const setPrimaryContact = Workflow.name("masters.contact.set-primary")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const contact = await ctx.step.run(fetchContactStep, { id: input.id });

    await ctx.step.run("unset-primary", () =>
      unsetPrimaryContacts(ctx.db, contact.entityType, contact.entityId),
    );

    const [updated] = await ctx.db
      .update(masterContact)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(masterContact.id, input.id))
      .returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.PRIMARY_SET,
      entityId: contact.id,
      entityType: AUDIT_ENTITY_TYPE.CONTACT,
      metadata: { entityId: contact.entityId, entityType: contact.entityType },
    });

    return updated;
  });
