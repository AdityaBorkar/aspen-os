import { productsPriceList } from "#/db-schemas";
import { PRICE_LIST_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPriceListStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enablePriceList = Workflow.name("products.price-list.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchPriceListStep, { id });
    const [updated] = await ctx.db
      .update(productsPriceList)
      .set({ is_enabled: true, updated_at: new Date() })
      .where(eq(productsPriceList.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Price list with id "${id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PRICE_LIST,
      },
      PRICE_LIST_EVENTS.UPDATED,
      {
        changes: { isEnabled: true },
        priceList: { id: updated.id, name: updated.name },
      },
    );
    return updated;
  });
