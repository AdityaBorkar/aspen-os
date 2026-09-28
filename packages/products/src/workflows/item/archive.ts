import { productsItem } from "#/db-schemas";
import { ITEM_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const archiveItem = Workflow.name("products.item.archive")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchItemStep, { id });
    const [updated] = await ctx.db
      .update(productsItem)
      .set({ is_disabled: true, status: "archived", updated_at: new Date() })
      .where(eq(productsItem.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item with id "${id}" not found.`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ARCHIVED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      });
      await ctx.pubsub.publish(ITEM_EVENTS.ARCHIVED, { itemId: id });
    });
    return updated;
  });
