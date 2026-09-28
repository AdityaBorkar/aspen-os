import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { RESERVATION_EVENTS } from "#/pubsub";
import { getAvailableQty, getEffectiveSetting, requireWarehouse } from "#/services/stock-service";
import {
  ConsumeReservationSchema,
  CreateReservationSchema,
  IdSchema,
  ReleaseReservationsSchema,
  ReservationFiltersSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchReservationStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const createReservation = Workflow.name("inventory.reservation.create")
  .input(object({ input: CreateReservationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReservationSchema, input);
    const setting = await getEffectiveSetting(ctx.db);
    if (!setting.enableStockReservation) {
      throw new Error("Stock reservation is disabled in inventory settings.");
    }
    await requireWarehouse(ctx.db, parsed.warehouseId);
    const available = await getAvailableQty(ctx.db, parsed.itemId, parsed.warehouseId);
    if (available - parsed.reservedQty < 0) {
      throw new Error(`Cannot reserve ${parsed.reservedQty} units: only ${available} available.`);
    }

    const [reservation] = await ctx.db
      .insert(inventoryReservationEntry)
      .values({
        item_id: parsed.itemId,
        pick_list_id: parsed.pickListId ?? null,
        reserved_qty: parsed.reservedQty,
        sales_order_id: parsed.salesOrderId ?? null,
        sales_order_item_id: parsed.salesOrderItemId ?? null,
        status: "reserved",
        warehouse_id: parsed.warehouseId,
      })
      .returning();
    if (!reservation) {
      throw new Error("Failed to create reservation.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: reservation.id,
      entityType: AUDIT_ENTITY_TYPE.RESERVATION,
      newState: { id: reservation.id, item_id: reservation.item_id, status: reservation.status },
    });

    await ctx.pubsub.publish(RESERVATION_EVENTS.CREATED, {
      itemId: reservation.item_id,
      reservationId: reservation.id,
      warehouseId: reservation.warehouse_id,
    });

    return reservation;
  });

export const getReservation = Workflow.name("inventory.reservation.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchReservationStep, { id: input.id }));

export const listReservations = Workflow.name("inventory.reservation.list")
  .input(object({ filters: ReservationFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(ReservationFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.itemId) {
      conditions.push(eq(inventoryReservationEntry.item_id, parsed.itemId));
    }
    if (parsed.warehouseId) {
      conditions.push(eq(inventoryReservationEntry.warehouse_id, parsed.warehouseId));
    }
    if (parsed.salesOrderId) {
      conditions.push(eq(inventoryReservationEntry.sales_order_id, parsed.salesOrderId));
    }
    if (parsed.status) {
      conditions.push(eq(inventoryReservationEntry.status, parsed.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await ctx.db
      .select()
      .from(inventoryReservationEntry)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
    return rows;
  });

export const consumeReservation = Workflow.name("inventory.reservation.consume")
  .input(object({ input: ConsumeReservationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ConsumeReservationSchema, input);
    const current = await ctx.step.run(fetchReservationStep, { id: parsed.id });
    if (current.status === "delivered" || current.status === "cancelled") {
      throw new Error(`Reservation is already ${current.status}.`);
    }
    const remaining = current.reserved_qty - current.delivered_qty;
    if (parsed.qty <= 0 || parsed.qty > remaining) {
      throw new Error(`Cannot consume ${parsed.qty} units: ${remaining} remain reserved.`);
    }
    const deliveredQty = current.delivered_qty + parsed.qty;
    const status = deliveredQty >= current.reserved_qty ? "delivered" : "partially_delivered";

    const [updated] = await ctx.db
      .update(inventoryReservationEntry)
      .set({ delivered_qty: deliveredQty, status, updated_at: new Date() })
      .where(eq(inventoryReservationEntry.id, parsed.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to consume reservation.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CONSUMED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RESERVATION,
      newState: { delivered_qty: deliveredQty, id: parsed.id, status },
    });

    await ctx.pubsub.publish(RESERVATION_EVENTS.CONSUMED, {
      consumedQty: parsed.qty,
      itemId: updated.item_id,
      reservationId: parsed.id,
      warehouseId: updated.warehouse_id,
    });

    return updated;
  });

export const releaseReservation = Workflow.name("inventory.reservation.release")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchReservationStep, { id: input.id });
    if (current.status === "cancelled") {
      return current;
    }
    if (current.status === "delivered") {
      throw new Error("Delivered reservations cannot be released.");
    }
    const [updated] = await ctx.db
      .update(inventoryReservationEntry)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(inventoryReservationEntry.id, input.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to release reservation.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.RELEASED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.RESERVATION,
      newState: { id: input.id, status: "cancelled" },
    });

    await ctx.pubsub.publish(RESERVATION_EVENTS.RELEASED, {
      itemId: updated.item_id,
      reservationId: input.id,
      warehouseId: updated.warehouse_id,
    });

    return updated;
  });

export const releaseManyReservations = Workflow.name("inventory.reservation.release-many")
  .input(object({ input: ReleaseReservationsSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReleaseReservationsSchema, input);
    const released = await Promise.all(
      parsed.ids.map(async (id) => {
        const current = await ctx.step.run(fetchReservationStep, { id });
        if (current.status === "cancelled") {
          return current;
        }
        if (current.status === "delivered") {
          throw new Error(`Reservation "${id}" is delivered and cannot be released.`);
        }
        const [updated] = await ctx.db
          .update(inventoryReservationEntry)
          .set({ status: "cancelled", updated_at: new Date() })
          .where(eq(inventoryReservationEntry.id, id))
          .returning();
        if (!updated) {
          throw new Error(`Failed to release reservation "${id}".`);
        }
        return updated;
      }),
    );
    await ctx.audit.write({
      action: AUDIT_ACTION.RELEASED,
      crudAction: "update",
      entityId: parsed.ids.join(","),
      entityType: AUDIT_ENTITY_TYPE.RESERVATION,
      newState: { count: released.length, status: "cancelled" },
    });
    await Promise.all(
      released.map((reservation) =>
        ctx.pubsub.publish(RESERVATION_EVENTS.RELEASED, {
          itemId: reservation.item_id,
          reservationId: reservation.id,
          warehouseId: reservation.warehouse_id,
        }),
      ),
    );
    return released;
  });
