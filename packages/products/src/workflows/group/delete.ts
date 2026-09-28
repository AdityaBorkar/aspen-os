import { productsItem, productsItemGroup } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchGroupStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteGroup = Workflow.name("products.group.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchGroupStep, { id });

    const [child] = await ctx.db
      .select({ id: productsItemGroup.id })
      .from(productsItemGroup)
      .where(eq(productsItemGroup.parent_id, id))
      .limit(1);
    if (child) {
      throw new Error("Cannot delete group while child groups exist. Reparent them first.");
    }

    const [linkedItem] = await ctx.db
      .select({ id: productsItem.id })
      .from(productsItem)
      .where(eq(productsItem.item_group_id, id))
      .limit(1);
    if (linkedItem) {
      throw new Error("Cannot delete group while items reference it. Disable it instead.");
    }

    const [deleted] = await ctx.db
      .delete(productsItemGroup)
      .where(eq(productsItemGroup.id, id))
      .returning({ id: productsItemGroup.id });
    if (!deleted) {
      throw new Error(`Item group with id "${id}" not found.`);
    }

    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.GROUP,
    });

    return { deleted: true };
  });
