import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { WAREHOUSE_EVENTS } from "#/pubsub";
import { hasChildren, hasLedgerHistory, requireWarehouse } from "#/services/stock-service";
import { IdSchema, UpdateWarehouseSchema, WarehouseFiltersSchema, WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchWarehouseStep } from "#/workflow-steps/fetch-inventory";
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const getWarehouse = Workflow.name("inventory.warehouse.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchWarehouseStep, { id: input.id }));

const ListInputSchema = object({ filters: WarehouseFiltersSchema });

export const listWarehouses = Workflow.name("inventory.warehouse.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(WarehouseFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (!parsed.includeDisabled) {
      conditions.push(eq(inventoryWarehouse.is_disabled, false));
    }
    if (parsed.isGroup !== undefined) {
      conditions.push(eq(inventoryWarehouse.is_group, parsed.isGroup));
    }
    if (parsed.parentId !== undefined) {
      if (parsed.parentId === null) {
        conditions.push(sql`${inventoryWarehouse.parent_id} IS NULL`);
      } else {
        conditions.push(eq(inventoryWarehouse.parent_id, parsed.parentId));
      }
    }
    if (parsed.warehouseType) {
      conditions.push(eq(inventoryWarehouse.warehouse_type, parsed.warehouseType));
    }
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryWarehouse)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

const UpdateInputSchema = object({ id: IdSchema, patch: UpdateWarehouseSchema });

export const updateWarehouse = Workflow.name("inventory.warehouse.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateWarehouseSchema, patch);
    const current = await ctx.step.run(fetchWarehouseStep, { id });

    if (parsed.isGroup !== undefined && parsed.isGroup !== current.is_group) {
      if (await hasChildren(ctx.db, id)) {
        throw new Error("Cannot flip group/leaf on a warehouse with children.");
      }
      if (await hasLedgerHistory(ctx.db, id)) {
        throw new Error("Cannot flip group/leaf on a warehouse with stock history.");
      }
    }

    if (parsed.parentId !== undefined && parsed.parentId !== current.parent_id) {
      if (parsed.parentId === id) {
        throw new Error("A warehouse cannot be its own parent.");
      }
      if (parsed.parentId !== null) {
        const parent = await requireWarehouse(ctx.db, parsed.parentId, {
          allowDisabled: true,
          allowGroup: true,
        });
        if (!parent.is_group) {
          throw new Error("A warehouse can only be moved under a group warehouse.");
        }
      }
      if (await hasLedgerHistory(ctx.db, id)) {
        throw new Error("Cannot move a warehouse with stock history.");
      }
    }

    const values: Partial<typeof inventoryWarehouse.$inferInsert> = {};
    if (parsed.accountHead !== undefined) {
      values.account_head = parsed.accountHead;
    }
    if (parsed.addressId !== undefined) {
      values.address_id = parsed.addressId;
    }
    if (parsed.contactId !== undefined) {
      values.contact_id = parsed.contactId;
    }
    if (parsed.isGroup !== undefined) {
      values.is_group = parsed.isGroup;
    }
    if (parsed.name !== undefined) {
      values.name = parsed.name;
    }
    if (parsed.parentId !== undefined) {
      values.parent_id = parsed.parentId;
    }
    if (parsed.warehouseType !== undefined) {
      values.warehouse_type = parsed.warehouseType;
    }

    const [updated] = await ctx.db
      .update(inventoryWarehouse)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryWarehouse.id, id))
      .returning();

    const next = assertReturned(updated, "Failed to update warehouse.");

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE,
      newState: { id: next.id, name: next.name },
      previousState: { id: current.id, name: current.name },
    });

    await ctx.pubsub.publish(WAREHOUSE_EVENTS.UPDATED, {
      accountHead: next.account_head ?? undefined,
      addressId: next.address_id ?? undefined,
      contactId: next.contact_id ?? undefined,
      isGroup: next.is_group,
      name: next.name,
      parentId: next.parent_id ?? undefined,
      warehouseId: id,
      warehouseType: next.warehouse_type,
    });

    return next;
  });

export const disableWarehouse = Workflow.name("inventory.warehouse.disable")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchWarehouseStep, { id: input.id });
    if (current.is_disabled) {
      return current;
    }

    const [updated] = await ctx.db
      .update(inventoryWarehouse)
      .set({ is_disabled: true, updated_at: new Date() })
      .where(eq(inventoryWarehouse.id, input.id))
      .returning();

    const next = assertReturned(updated, "Failed to disable warehouse.");

    await ctx.audit.write({
      action: AUDIT_ACTION.DISABLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE,
      newState: { id: next.id, is_disabled: true },
    });

    await ctx.pubsub.publish(WAREHOUSE_EVENTS.DISABLED, { warehouseId: input.id });

    return next;
  });
