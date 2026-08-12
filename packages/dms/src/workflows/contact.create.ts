import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsContact } from "../db-schemas";
import { CONTACT_EVENTS } from "../pubsub";
import { CreateContactSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

const CreateInputSchema = object({ input: CreateContactSchema });

export const createContact = Workflow.name("dms.contact.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateContactSchema, input);

    const [contact] = await ctx.db
      .insert(dmsContact)
      .values({
        companyName: parsed.companyName,
        createdBy: parsed.createdBy,
        deletionReason: parsed.deletionReason ?? null,
        designation: parsed.designation,
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        linkedUserId: parsed.linkedUserId ?? null,
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
          companyName: contact.companyName,
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
