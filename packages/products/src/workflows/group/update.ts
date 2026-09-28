import { productsItemGroup } from "#/db-schemas";
import { ITEM_GROUP_EVENTS } from "#/pubsub";
import { UpdateGroupSchema } from "#/schemas";
import { validateParentGroup } from "#/services/group-hierarchy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchGroupStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateGroupSchema });

export const updateGroup = Workflow.name("products.group.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchGroupStep, { id: input.id });

    const nextParent =
      input.patch.parentId === undefined ? current.parent_id : input.patch.parentId;
    if (nextParent !== null && nextParent !== undefined) {
      await validateParentGroup(ctx.db, nextParent, input.id);
    }

    const nextName = input.patch.name ?? current.name;
    const siblingCondition =
      nextParent === null || nextParent === undefined
        ? isNull(productsItemGroup.parent_id)
        : eq(productsItemGroup.parent_id, nextParent);
    const [sibling] = await ctx.db
      .select({ id: productsItemGroup.id })
      .from(productsItemGroup)
      .where(
        and(
          eq(productsItemGroup.name, nextName),
          siblingCondition,
          ne(productsItemGroup.id, input.id),
        ),
      )
      .limit(1);
    if (sibling) {
      throw new Error(`Group "${nextName}" already exists under the same parent.`);
    }

    const updates = stripUndefined({
      default_cost_center: input.patch.defaultCostCenter,
      default_expense_account: input.patch.defaultExpenseAccount,
      default_income_account: input.patch.defaultIncomeAccount,
      default_item_tax_template: input.patch.defaultItemTaxTemplate,
      default_price_list: input.patch.defaultPriceList,
      default_supplier_id: input.patch.defaultSupplierId,
      default_warehouse_id: input.patch.defaultWarehouseId,
      is_disabled: input.patch.isDisabled,
      is_group: input.patch.isGroup,
      name: input.patch.name,
      naming_prefix: input.patch.namingPrefix,
      naming_series: input.patch.namingSeries,
      parent_id: input.patch.parentId,
      show_in_website: input.patch.showInWebsite,
      tax_category: input.patch.taxCategory,
      weightage: input.patch.weightage,
    });

    const [updated] = await ctx.db
      .update(productsItemGroup)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsItemGroup.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Item group with id "${input.id}" not found.`);
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.GROUP,
      },
      ITEM_GROUP_EVENTS.UPDATED,
      {
        changes: eventChanges(updates),
        itemGroup: { id: updated.id, name: updated.name },
      },
    );

    return updated;
  });
