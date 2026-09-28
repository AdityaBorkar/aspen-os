import { inventoryPickList } from "#/db-schemas/pick-list";
import { inventoryPickListItem } from "#/db-schemas/pick-list-item";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { PICK_LIST_EVENTS, RESERVATION_EVENTS } from "#/pubsub";
import { suggestPickLocations } from "#/services/pick-suggest";
import {
  getAvailableQty,
  getEffectiveSetting,
  getOnHandQty,
  requireWarehouse,
} from "#/services/stock-service";
import {
  CreatePickListSchema,
  IdSchema,
  PickListFiltersSchema,
  SuggestPickLocationsSchema,
  UpdatePickedQtySchema,
  UpdatePickListSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPickListStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const createPickList = Workflow.name("inventory.pick-list.create")
  .input(object({ input: CreatePickListSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePickListSchema, input);
    if (parsed.parentWarehouseId) {
      await requireWarehouse(ctx.db, parsed.parentWarehouseId, { allowGroup: true });
    }
    await Promise.all(
      parsed.items.map(async (item) => {
        if (item.warehouseId) {
          await requireWarehouse(ctx.db, item.warehouseId);
        }
      }),
    );

    const [pickList] = await ctx.db
      .insert(inventoryPickList)
      .values({
        parent_warehouse_id: parsed.parentWarehouseId ?? null,
        prompt_qty: parsed.promptQty ?? false,
        purpose: parsed.purpose ?? "delivery",
        scan_mode: parsed.scanMode ?? false,
        status: "draft",
      })
      .returning();
    if (!pickList) {
      throw new Error("Failed to create pick list.");
    }

    await Promise.all(
      parsed.items.map((item) =>
        ctx.db.insert(inventoryPickListItem).values({
          batch_no: item.batchNo ?? null,
          item_id: item.itemId,
          material_request_id: item.materialRequestId ?? null,
          pick_list_id: pickList.id,
          picked_qty: 0,
          qty: item.qty,
          sales_order_id: item.salesOrderId ?? null,
          sales_order_item_id: item.salesOrderItemId ?? null,
          serial_nos: item.serialNos ?? [],
          warehouse_id: item.warehouseId ?? null,
        }),
      ),
    );

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: pickList.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: pickList.id, purpose: pickList.purpose, status: pickList.status },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.CREATED, {
      pickListId: pickList.id,
      purpose: pickList.purpose,
    });

    return pickList;
  });

export const getPickList = Workflow.name("inventory.pick-list.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const pickList = await ctx.step.run(fetchPickListStep, { id: input.id });
    const items = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, input.id));
    return { items, pickList };
  });

export const listPickLists = Workflow.name("inventory.pick-list.list")
  .input(object({ filters: PickListFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(PickListFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.purpose) {
      conditions.push(eq(inventoryPickList.purpose, parsed.purpose));
    }
    if (parsed.status) {
      conditions.push(eq(inventoryPickList.status, parsed.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await ctx.db
      .select()
      .from(inventoryPickList)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
    return rows;
  });

export const updatePickList = Workflow.name("inventory.pick-list.update")
  .input(object({ id: IdSchema, patch: UpdatePickListSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdatePickListSchema, patch);
    const current = await ctx.step.run(fetchPickListStep, { id });
    if (current.status !== "draft") {
      throw new Error(
        "Only draft pick lists can be edited (planner batch picks survive save until submit).",
      );
    }
    if (parsed.parentWarehouseId !== undefined && parsed.parentWarehouseId !== null) {
      await requireWarehouse(ctx.db, parsed.parentWarehouseId, { allowGroup: true });
    }

    const values: Partial<typeof inventoryPickList.$inferInsert> = {};
    if (parsed.parentWarehouseId !== undefined) {
      values.parent_warehouse_id = parsed.parentWarehouseId;
    }
    if (parsed.promptQty !== undefined) {
      values.prompt_qty = parsed.promptQty;
    }
    if (parsed.scanMode !== undefined) {
      values.scan_mode = parsed.scanMode;
    }

    const [updated] = await ctx.db
      .update(inventoryPickList)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryPickList.id, id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update pick list.");
    }

    if (parsed.items !== undefined) {
      await ctx.db.delete(inventoryPickListItem).where(eq(inventoryPickListItem.pick_list_id, id));
      await Promise.all(
        parsed.items.map((item) =>
          ctx.db.insert(inventoryPickListItem).values({
            batch_no: item.batchNo ?? null,
            item_id: item.itemId,
            material_request_id: item.materialRequestId ?? null,
            pick_list_id: id,
            picked_qty: 0,
            qty: item.qty,
            sales_order_id: item.salesOrderId ?? null,
            sales_order_item_id: item.salesOrderItemId ?? null,
            serial_nos: item.serialNos ?? [],
            warehouse_id: item.warehouseId ?? null,
          }),
        ),
      );
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id, status: "draft" },
    });

    return updated;
  });

export const refreshPickListStock = Workflow.name("inventory.pick-list.refresh-stock")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const pickList = await ctx.step.run(fetchPickListStep, { id: input.id });
    if (pickList.status !== "draft") {
      throw new Error(
        "Stock can only be refreshed on draft pick lists (before downstream creation).",
      );
    }
    const items = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, input.id));
    const lines = await Promise.all(
      items.map(async (item) => {
        if (!item.warehouse_id) {
          return {
            availableQty: null,
            itemId: item.item_id,
            onHandQty: null,
            pickItemId: item.id,
          };
        }
        const [available, onHand] = await Promise.all([
          getAvailableQty(ctx.db, item.item_id, item.warehouse_id),
          getOnHandQty(ctx.db, item.item_id, item.warehouse_id),
        ]);
        return {
          availableQty: available,
          itemId: item.item_id,
          onHandQty: onHand,
          pickItemId: item.id,
        };
      }),
    );
    return { lines, pickListId: input.id };
  });

export const submitPickList = Workflow.name("inventory.pick-list.submit")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    if (current.status !== "draft") {
      throw new Error("Only draft pick lists can be submitted.");
    }
    const items = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, input.id));
    if (items.length === 0) {
      throw new Error("Cannot submit a pick list without items.");
    }
    for (const item of items) {
      if (!item.warehouse_id) {
        throw new Error(
          `Pick item for "${item.item_id}" has no warehouse location (run Get Item Locations first).`,
        );
      }
    }

    const [updated] = await ctx.db
      .update(inventoryPickList)
      .set({ status: "submitted", updated_at: new Date() })
      .where(eq(inventoryPickList.id, input.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to submit pick list.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.SUBMITTED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, status: "submitted" },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.SUBMITTED, {
      pickListId: input.id,
      purpose: updated.purpose,
    });

    return updated;
  });

export const cancelPickList = Workflow.name("inventory.pick-list.cancel")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    if (current.status === "cancelled") {
      return current;
    }
    if (current.is_consumed) {
      throw new Error("Pick list already has a downstream document and cannot be cancelled.");
    }
    const [updated] = await ctx.db
      .update(inventoryPickList)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(inventoryPickList.id, input.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to cancel pick list.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CANCELLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, status: "cancelled" },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.CANCELLED, {
      pickListId: input.id,
      purpose: updated.purpose,
    });

    return updated;
  });

export const markPickListConsumed = Workflow.name("inventory.pick-list.mark-consumed")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    if (current.status !== "submitted") {
      throw new Error("Only submitted pick lists can be marked consumed.");
    }
    const [updated] = await ctx.db
      .update(inventoryPickList)
      .set({ is_consumed: true, updated_at: new Date() })
      .where(eq(inventoryPickList.id, input.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to mark pick list consumed.");
    }
    return updated;
  });

export const suggestPickListLocations = Workflow.name("inventory.pick-list.suggest")
  .input(object({ input: SuggestPickLocationsSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SuggestPickLocationsSchema, input);
    return suggestPickLocations(ctx.db, {
      items: parsed.items.map((item) => ({
        batchNo: item.batchNo ?? null,
        itemId: item.itemId,
        qty: item.qty,
      })),
      parentWarehouseId: parsed.parentWarehouseId ?? null,
    });
  });

export const reservePickList = Workflow.name("inventory.pick-list.reserve")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    if (current.status !== "submitted") {
      throw new Error("Only submitted pick lists can reserve stock.");
    }
    const setting = await getEffectiveSetting(ctx.db);
    if (!setting.enableStockReservation) {
      throw new Error("Stock reservation is disabled in inventory settings.");
    }
    const items = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, input.id));
    if (items.length === 0) {
      throw new Error("Cannot reserve an empty pick list.");
    }
    const checks = await Promise.all(
      items.map(async (item) => {
        if (!item.warehouse_id) {
          throw new Error(`Pick item for "${item.item_id}" has no warehouse location.`);
        }
        return {
          available: await getAvailableQty(ctx.db, item.item_id, item.warehouse_id),
          item,
        };
      }),
    );
    for (const check of checks) {
      if (check.available - check.item.qty < 0) {
        throw new Error(
          `Cannot reserve ${check.item.qty} units of "${check.item.item_id}": only ${check.available} available.`,
        );
      }
    }
    const created = await Promise.all(
      items.map(async (item) => {
        if (!item.warehouse_id) {
          throw new Error(`Pick item for "${item.item_id}" has no warehouse location.`);
        }
        const [reservation] = await ctx.db
          .insert(inventoryReservationEntry)
          .values({
            item_id: item.item_id,
            pick_list_id: input.id,
            reserved_qty: item.qty,
            sales_order_id: item.sales_order_id,
            sales_order_item_id: item.sales_order_item_id,
            status: "reserved",
            warehouse_id: item.warehouse_id,
          })
          .returning();
        if (!reservation) {
          throw new Error("Failed to create reservation.");
        }
        return reservation;
      }),
    );
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, reserved: created.length },
    });
    await Promise.all(
      created.map((reservation) =>
        ctx.pubsub.publish(RESERVATION_EVENTS.CREATED, {
          itemId: reservation.item_id,
          reservationId: reservation.id,
          warehouseId: reservation.warehouse_id,
        }),
      ),
    );
    return created;
  });

export const updatePickedQty = Workflow.name("inventory.pick-list.update-picked")
  .input(object({ input: UpdatePickedQtySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdatePickedQtySchema, input);
    const current = await ctx.step.run(fetchPickListStep, { id: parsed.id });
    if (current.status !== "submitted") {
      throw new Error("Picked quantities can only be updated on submitted pick lists.");
    }
    const updated = await Promise.all(
      parsed.lines.map(async (line) => {
        if (line.pickedQty < 0) {
          throw new Error("Picked quantity cannot be negative.");
        }
        const [row] = await ctx.db
          .update(inventoryPickListItem)
          .set({ picked_qty: line.pickedQty })
          .where(
            and(
              eq(inventoryPickListItem.id, line.pickItemId),
              eq(inventoryPickListItem.pick_list_id, parsed.id),
            ),
          )
          .returning();
        if (!row) {
          throw new Error(`Pick item "${line.pickItemId}" not found on this list.`);
        }
        if (line.pickedQty - row.qty > 0) {
          throw new Error(`Picked quantity exceeds the required ${row.qty} for this line.`);
        }
        return row;
      }),
    );
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: parsed.id, linesUpdated: updated.length },
    });
    return updated;
  });
