import { masterAddress } from "#/db-schemas";
import { ADDRESS_EVENTS } from "#/pubsub";
import { UpdateAddressSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchAddressStep } from "#/workflow-steps/fetch-address";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateAddressSchema,
});

export const updateAddress = Workflow.name("masters.address.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchAddressStep, { id: input.id });

    const updates = stripUndefined({
      city: input.patch.city,
      country: input.patch.country,
      label: input.patch.label,
      line1: input.patch.line1,
      line2: input.patch.line2,
      metadata: input.patch.metadata,
      postalCode: input.patch.postalCode,
      state: input.patch.state,
    });

    const [updated] = await ctx.db
      .update(masterAddress)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterAddress.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Address with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ADDRESS,
      });

      await ctx.pubsub.publish(ADDRESS_EVENTS.UPDATED, {
        address: { id: updated.id },
        changes: updates,
        entityId: updated.entity_id,
        entityType: updated.entity_type,
      });
    });

    return updated;
  });
