import { masterAddress } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAddressStep } from "#/workflow-steps/fetch-address";
import { unsetPrimaryAddresses } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const setPrimaryAddress = Workflow.name("masters.address.set-primary")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const address = await ctx.step.run(fetchAddressStep, { id: input.id });

    await ctx.step.run("unset-primary", () =>
      unsetPrimaryAddresses(ctx.db, address.entityType, address.entityId),
    );

    const [updated] = await ctx.db
      .update(masterAddress)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(masterAddress.id, input.id))
      .returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.PRIMARY_SET,
      entityId: address.id,
      entityType: AUDIT_ENTITY_TYPE.ADDRESS,
      metadata: { entityId: address.entityId, entityType: address.entityType },
    });

    return updated;
  });
