import { productsItem } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const MarkInputSchema = object({ id: IdSchema });

export const markItemTransacted = Workflow.name("products.item.mark-transacted")
  .input(MarkInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchItemStep, { id });
    const [updated] = await ctx.db
      .update(productsItem)
      .set({ has_transactions: true, updated_at: new Date() })
      .where(eq(productsItem.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { hasTransactions: true },
      });
    });
    return updated;
  });
