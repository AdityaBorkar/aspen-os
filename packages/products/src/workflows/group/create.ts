import { productsItemGroup } from "#/db-schemas";
import { ITEM_GROUP_EVENTS } from "#/pubsub";
import { CreateGroupSchema } from "#/schemas";
import { validateParentGroup } from "#/services/group-hierarchy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateGroupSchema });

export const createGroup = Workflow.name("products.group.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateGroupSchema, input);

    if (parsed.parentId !== undefined && parsed.parentId !== null) {
      await validateParentGroup(ctx.db, parsed.parentId);
    }

    const siblingCondition =
      parsed.parentId === undefined || parsed.parentId === null
        ? isNull(productsItemGroup.parent_id)
        : eq(productsItemGroup.parent_id, parsed.parentId);
    const [sibling] = await ctx.db
      .select({ id: productsItemGroup.id })
      .from(productsItemGroup)
      .where(and(eq(productsItemGroup.name, parsed.name), siblingCondition))
      .limit(1);
    if (sibling) {
      throw new Error(`Group "${parsed.name}" already exists under the same parent.`);
    }

    const [group] = await ctx.db
      .insert(productsItemGroup)
      .values({
        default_cost_center: parsed.defaultCostCenter ?? null,
        default_expense_account: parsed.defaultExpenseAccount ?? null,
        default_income_account: parsed.defaultIncomeAccount ?? null,
        default_item_tax_template: parsed.defaultItemTaxTemplate ?? null,
        default_price_list: parsed.defaultPriceList ?? null,
        default_supplier_id: parsed.defaultSupplierId ?? null,
        default_warehouse_id: parsed.defaultWarehouseId ?? null,
        is_group: parsed.isGroup ?? false,
        name: parsed.name,
        naming_prefix: parsed.namingPrefix ?? null,
        naming_series: parsed.namingSeries ?? null,
        parent_id: parsed.parentId ?? null,
        show_in_website: parsed.showInWebsite ?? false,
        tax_category: parsed.taxCategory ?? null,
        weightage: parsed.weightage ?? null,
      })
      .returning();

    if (!group) {
      throw new Error("Failed to create item group.");
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: group.id,
        entityType: AUDIT_ENTITY_TYPE.GROUP,
        newState: { name: group.name, parentId: group.parent_id },
      },
      ITEM_GROUP_EVENTS.CREATED,
      {
        itemGroup: { id: group.id, name: group.name },
      },
    );

    return group;
  });
