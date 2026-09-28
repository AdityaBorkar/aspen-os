import { inventoryPickList } from "#/db-schemas/pick-list";
import { inventoryPickListItem } from "#/db-schemas/pick-list-item";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { PICK_LIST_EVENTS, RESERVATION_EVENTS } from "#/pubsub";
import { suggestPickLocations } from "#/services/pick-suggest";
import {
  getEffectiveSetting,
  getStockKey,
  getStockStates,
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
import { assertReturned, paginationOf, requireStatus, whereFrom } from "#/workflows/utils";

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
    const warehouseIds = [
      ...new Set(parsed.items.flatMap((item) => (item.warehouseId ? [item.warehouseId] : []))),
    ];
    await Promise.all(warehouseIds.map((warehouseId) => requireWarehouse(ctx.db, warehouseId)));

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
    const created = assertReturned(pickList, "Failed to create pick list.");

    if (parsed.items.length > 0) {
      await ctx.db.insert(inventoryPickListItem).values(
        parsed.items.map((item) => ({
          batch_no: item.batchNo ?? null,
          item_id: item.itemId,
          material_request_id: item.materialRequestId ?? null,
          pick_list_id: created.id,
          picked_qty: 0,
          qty: item.qty,
          sales_order_id: item.salesOrderId ?? null,
          sales_order_item_id: item.salesOrderItemId ?? null,
          serial_nos: item.serialNos ?? [],
          warehouse_id: item.warehouseId ?? null,
        })),
      );
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: created.id, purpose: created.purpose, status: created.status },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.CREATED, {
      pickListId: created.id,
      purpose: created.purpose,
    });

    return created;
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
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryPickList)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

export const updatePickList = Workflow.name("inventory.pick-list.update")
  .input(object({ id: IdSchema, patch: UpdatePickListSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdatePickListSchema, patch);
    const current = await ctx.step.run(fetchPickListStep, { id });
    requireStatus(current.status, ["draft"], "be edited", "pick list");
    if (parsed.parentWarehouseId !== undefined && parsed.parentWarehouseId !== null) {
      await requireWarehouse(ctx.db, parsed.parentWarehouseId, { allowGroup: true });
    }

    const updated = await ctx.db.transaction(async (tx) => {
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
      const [row] = await tx
        .update(inventoryPickList)
        .set({ ...values, updated_at: new Date() })
        .where(eq(inventoryPickList.id, id))
        .returning();
      const next = assertReturned(row, "Failed to update pick list.");

      if (parsed.items !== undefined) {
        await tx.delete(inventoryPickListItem).where(eq(inventoryPickListItem.pick_list_id, id));
        if (parsed.items.length > 0) {
          await tx.insert(inventoryPickListItem).values(
            parsed.items.map((item) => ({
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
            })),
          );
        }
      }
      return next;
    });

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
    requireStatus(pickList.status, ["draft"], "be refreshed", "pick list");
    const items = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, input.id));
    const located = items.filter(
      (item): item is typeof item & { warehouse_id: string } => item.warehouse_id !== null,
    );
    const states = await getStockStates(
      ctx.db,
      located.map((item) => ({
        itemId: item.item_id,
        warehouseId: item.warehouse_id,
      })),
    );
    const lines = items.map((item) => {
      if (!item.warehouse_id) {
        return {
          availableQty: null,
          itemId: item.item_id,
          onHandQty: null,
          pickItemId: item.id,
        };
      }
      const state = states.get(getStockKey(item.item_id, item.warehouse_id));
      return {
        availableQty: state?.available ?? 0,
        itemId: item.item_id,
        onHandQty: state?.onHand ?? 0,
        pickItemId: item.id,
      };
    });
    return { lines, pickListId: input.id };
  });

export const submitPickList = Workflow.name("inventory.pick-list.submit")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    requireStatus(current.status, ["draft"], "be submitted", "pick list");
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
    const next = assertReturned(updated, "Failed to submit pick list.");

    await ctx.audit.write({
      action: AUDIT_ACTION.SUBMITTED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, status: "submitted" },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.SUBMITTED, {
      pickListId: input.id,
      purpose: next.purpose,
    });

    return next;
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
    const next = assertReturned(updated, "Failed to cancel pick list.");

    await ctx.audit.write({
      action: AUDIT_ACTION.CANCELLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, status: "cancelled" },
    });

    await ctx.pubsub.publish(PICK_LIST_EVENTS.CANCELLED, {
      pickListId: input.id,
      purpose: next.purpose,
    });

    return next;
  });

export const markPickListConsumed = Workflow.name("inventory.pick-list.mark-consumed")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    requireStatus(current.status, ["submitted"], "be marked consumed", "pick list");
    const [updated] = await ctx.db
      .update(inventoryPickList)
      .set({ is_consumed: true, updated_at: new Date() })
      .where(eq(inventoryPickList.id, input.id))
      .returning();
    const next = assertReturned(updated, "Failed to mark pick list consumed.");
    await ctx.audit.write({
      action: AUDIT_ACTION.CONSUMED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: input.id, is_consumed: true },
    });
    return next;
  });

export const suggestPickListLocations = Workflow.name("inventory.pick-list.suggest")
  .input(object({ input: SuggestPickLocationsSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SuggestPickLocationsSchema, input);
    return suggestPickLocations(ctx.db, {
      items: parsed.items,
      parentWarehouseId: parsed.parentWarehouseId ?? null,
    });
  });

export const reservePickList = Workflow.name("inventory.pick-list.reserve")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPickListStep, { id: input.id });
    requireStatus(current.status, ["submitted"], "reserve stock", "pick list");
    const created = await ctx.db.transaction(async (tx) => {
      const setting = await getEffectiveSetting(tx);
      if (!setting.enableStockReservation) {
        throw new Error("Stock reservation is disabled in inventory settings.");
      }
      const items = await tx
        .select()
        .from(inventoryPickListItem)
        .where(eq(inventoryPickListItem.pick_list_id, input.id));
      if (items.length === 0) {
        throw new Error("Cannot reserve an empty pick list.");
      }
      const locatedItems = items.filter(
        (item): item is typeof item & { warehouse_id: string } => item.warehouse_id !== null,
      );
      if (locatedItems.length !== items.length) {
        const missing = items.find((item) => item.warehouse_id === null);
        throw new Error(`Pick item for "${missing?.item_id}" has no warehouse location.`);
      }
      const states = await getStockStates(
        tx,
        locatedItems.map((item) => ({
          itemId: item.item_id,
          warehouseId: item.warehouse_id,
        })),
      );
      for (const item of locatedItems) {
        const available = states.get(getStockKey(item.item_id, item.warehouse_id))?.available ?? 0;
        if (available - item.qty < 0) {
          throw new Error(
            `Cannot reserve ${item.qty} units of "${item.item_id}": only ${available} available.`,
          );
        }
      }
      const rows = await tx
        .insert(inventoryReservationEntry)
        .values(
          locatedItems.map((item) => ({
            item_id: item.item_id,
            pick_list_id: input.id,
            reserved_qty: item.qty,
            sales_order_id: item.sales_order_id,
            sales_order_item_id: item.sales_order_item_id,
            status: "reserved" as const,
            warehouse_id: item.warehouse_id,
          })),
        )
        .returning();
      if (rows.length !== items.length) {
        throw new Error("Failed to create reservations for all pick items.");
      }
      return rows;
    });
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
    requireStatus(current.status, ["submitted"], "update picked quantities", "pick list");
    const existing = await ctx.db
      .select()
      .from(inventoryPickListItem)
      .where(eq(inventoryPickListItem.pick_list_id, parsed.id));
    const byId = new Map(existing.map((row) => [row.id, row]));
    for (const line of parsed.lines) {
      if (line.pickedQty < 0) {
        throw new Error("Picked quantity cannot be negative.");
      }
      const row = byId.get(line.pickItemId);
      if (!row || row.pick_list_id !== parsed.id) {
        throw new Error(`Pick item "${line.pickItemId}" not found on this list.`);
      }
      if (line.pickedQty - row.qty > 0) {
        throw new Error(`Picked quantity exceeds the required ${row.qty} for this line.`);
      }
    }
    const updated = await ctx.db.transaction(async (tx) => {
      const rows = [];
      for (const line of parsed.lines) {
        const [row] = await tx
          .update(inventoryPickListItem)
          .set({ picked_qty: line.pickedQty })
          .where(
            and(
              eq(inventoryPickListItem.id, line.pickItemId),
              eq(inventoryPickListItem.pick_list_id, parsed.id),
            ),
          )
          .returning();
        rows.push(assertReturned(row, `Pick item "${line.pickItemId}" not found on this list.`));
      }
      return rows;
    });
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.PICK_LIST,
      newState: { id: parsed.id, linesUpdated: updated.length },
    });
    return updated;
  });
