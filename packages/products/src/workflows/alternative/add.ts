import { productsItemAlternative } from "#/db-schemas";
import { AddAlternativeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addAlternative = Workflow.name("products.alternative.add")
  .input(AddAlternativeSchema)
  .handler(async (input, ctx) => {
    if (input.itemId === input.alternativeItemId) {
      throw new Error("An item cannot be its own alternative.");
    }
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    await ctx.step.run(fetchItemStep, { id: input.alternativeItemId });
    const [existing] = await ctx.db
      .select({ id: productsItemAlternative.id })
      .from(productsItemAlternative)
      .where(
        and(
          eq(productsItemAlternative.item_id, input.itemId),
          eq(productsItemAlternative.alternative_item_id, input.alternativeItemId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("Alternative mapping already exists.");
    }
    const [row] = await ctx.db
      .insert(productsItemAlternative)
      .values({
        alternative_item_id: input.alternativeItemId,
        is_two_way: input.isTwoWay ?? false,
        item_id: input.itemId,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add alternative.");
    }
    if (input.isTwoWay ?? false) {
      const [reverse] = await ctx.db
        .select({ id: productsItemAlternative.id })
        .from(productsItemAlternative)
        .where(
          and(
            eq(productsItemAlternative.item_id, input.alternativeItemId),
            eq(productsItemAlternative.alternative_item_id, input.itemId),
          ),
        )
        .limit(1);
      if (!reverse) {
        await ctx.db.insert(productsItemAlternative).values({
          alternative_item_id: input.itemId,
          is_two_way: true,
          item_id: input.alternativeItemId,
        });
      }
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.ITEM,
      newState: { alternativeItemId: row.alternative_item_id, itemId: row.item_id },
    });
    return row;
  });
