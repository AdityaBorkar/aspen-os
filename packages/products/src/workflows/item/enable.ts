import { productsItem } from "#/db-schemas";
import { ITEM_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { assertTransition, itemLifecycleState } from "#/services/lifecycle";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enableItem = Workflow.name("products.item.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemStep, { id });
    if (current.status === "archived") {
      throw new Error("Archived items cannot be re-enabled.");
    }
    assertTransition("item", itemLifecycleState(current), "active");
    const [updated] = await ctx.db
      .update(productsItem)
      .set({ is_disabled: false, status: "active", updated_at: new Date() })
      .where(eq(productsItem.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item with id "${id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      },
      ITEM_EVENTS.ENABLED,
      { itemId: id },
    );
    return updated;
  });
