import { masterAddress } from "#/db-schemas";
import { ADDRESS_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAddressStep } from "#/workflow-steps/fetch-address";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteAddress = Workflow.name("masters.address.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchAddressStep, { id: input.id });

    await ctx.db.delete(masterAddress).where(eq(masterAddress.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.ADDRESS,
        metadata: { entityId: current.entityId, entityType: current.entityType },
      });

      await ctx.pubsub.publish(ADDRESS_EVENTS.REMOVED, {
        addressId: current.id,
      });
    });

    return { removed: true };
  });
