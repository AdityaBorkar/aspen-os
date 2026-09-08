import { masterContact } from "#/db-schemas";
import { CONTACT_EVENTS } from "#/pubsub";
import { CreateContactSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateContactSchema });

export const createContact = Workflow.name("masters.contact.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateContactSchema, input);

    const [contact] = await ctx.db
      .insert(masterContact)
      .values({
        company: parsed.company ?? null,
        email: parsed.email ?? null,
        entity_id: parsed.entityId,
        entity_type: parsed.entityType,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        phone: parsed.phone ?? null,
        title: parsed.title ?? null,
        type: parsed.type,
      })
      .returning();

    if (!contact) {
      throw new Error("Failed to create contact.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: contact.id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
        newState: {
          email: contact.email,
          entityId: contact.entity_id,
          entityType: contact.entity_type,
          name: contact.name,
          type: contact.type,
        },
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.CREATED, {
        contact: {
          id: contact.id,
          name: contact.name,
          type: contact.type,
        },
        entityType: contact.entity_type,
      });
    });

    return contact;
  });
