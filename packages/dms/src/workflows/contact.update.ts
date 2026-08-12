import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsContact } from "../db-schemas";
import { CONTACT_EVENTS } from "../pubsub";
import { IdSchema, UpdateContactSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";
import { fetchContactStep } from "./steps/fetch-contact";

const UpdateInputSchema = object({ id: IdSchema, patch: UpdateContactSchema });

export const updateContact = Workflow.name("dms.contact.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const current = await ctx.step.run(fetchContactStep, { id });

    const updates = stripUndefined({
      companyName: patch.companyName,
      designation: patch.designation,
      email: patch.email,
      firstName: patch.firstName,
      lastName: patch.lastName,
      linkedUserId: patch.linkedUserId,
      phone: patch.phone,
    });

    const [updated] = await ctx.db
      .update(dmsContact)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsContact.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: ctx.audit.diff(
          {
            companyName: current.companyName,
            designation: current.designation,
            email: current.email,
            phone: current.phone,
          },
          {
            companyName: updated?.companyName,
            designation: updated?.designation,
            email: updated?.email,
            phone: updated?.phone,
          },
        ),
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CONTACT,
      });

      await ctx.pubsub.publish(CONTACT_EVENTS.UPDATED, { contactId: id });
    });

    return updated ?? current;
  });
