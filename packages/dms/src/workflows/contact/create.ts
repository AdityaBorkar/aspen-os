import { dmsContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { CreateContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateContactSchema });

export const createContact = Workflow.name("dms.contact.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateContactSchema, input);

    const [contact] = await ctx.db
      .insert(dmsContact)
      .values({
        company_name: parsed.companyName,
        created_by: parsed.createdBy,
        deletion_reason: parsed.deletionReason ?? null,
        designation: parsed.designation,
        email: parsed.email,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        linked_user_id: parsed.linkedUserId ?? null,
        phone: parsed.phone,
      })
      .returning();

    if (!contact) {
      throw new Error("Failed to create contact.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "create",
        entityId: contact.id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
        newState: {
          companyName: contact.company_name,
          designation: contact.designation,
          email: contact.email,
        },
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.CREATED, {
        contactId: contact.id,
      });
    });

    return contact;
  });
