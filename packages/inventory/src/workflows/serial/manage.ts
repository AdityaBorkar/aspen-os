import { inventorySerial } from "#/db-schemas/serial";
import { SERIAL_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { requireWarehouse } from "#/services/stock-service";
import { CreateSerialSchema, IdSchema, SerialFiltersSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchSerialStep } from "#/workflow-steps/fetch-inventory";
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const createSerial = Workflow.name("inventory.serial.create")
  .input(object({ input: CreateSerialSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSerialSchema, input);
    if (parsed.warehouseId) {
      await requireWarehouse(ctx.db, parsed.warehouseId);
    }
    const [existing] = await ctx.db
      .select({ id: inventorySerial.id })
      .from(inventorySerial)
      .where(eq(inventorySerial.serial_no, parsed.serialNo))
      .limit(1);
    if (existing) {
      throw new Error(`Serial "${parsed.serialNo}" already exists.`);
    }

    const [serial] = await ctx.db
      .insert(inventorySerial)
      .values({
        amc_expiry_date: parsed.amcExpiryDate ? toDateOnly(parsed.amcExpiryDate) : null,
        batch_no: parsed.batchNo ?? null,
        item_id: parsed.itemId,
        purchase_id: parsed.purchaseId ?? null,
        serial_no: parsed.serialNo,
        status: "available",
        valuation_rate: parsed.valuationRate ?? null,
        warehouse_id: parsed.warehouseId ?? null,
        warranty_expiry_date: parsed.warrantyExpiryDate
          ? toDateOnly(parsed.warrantyExpiryDate)
          : null,
      })
      .returning();
    const created = assertReturned(serial, "Failed to create serial.");

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.SERIAL,
      newState: { id: created.id, item_id: created.item_id, serial_no: created.serial_no },
    });

    await ctx.pubsub.publish(SERIAL_EVENTS.CREATED, {
      itemId: created.item_id,
      serialId: created.id,
      serialNo: created.serial_no,
    });

    return created;
  });

export const getSerial = Workflow.name("inventory.serial.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchSerialStep, { id: input.id }));

export const listSerials = Workflow.name("inventory.serial.list")
  .input(object({ filters: SerialFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(SerialFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.itemId) {
      conditions.push(eq(inventorySerial.item_id, parsed.itemId));
    }
    if (parsed.warehouseId) {
      conditions.push(eq(inventorySerial.warehouse_id, parsed.warehouseId));
    }
    if (parsed.status) {
      conditions.push(eq(inventorySerial.status, parsed.status));
    }
    if (parsed.batchNo) {
      conditions.push(eq(inventorySerial.batch_no, parsed.batchNo));
    }
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventorySerial)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

export const expireSerial = Workflow.name("inventory.serial.expire")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchSerialStep, { id: input.id });
    if (current.status !== "available") {
      throw new Error(`Only available serials can expire (current: ${current.status}).`);
    }
    const [updated] = await ctx.db
      .update(inventorySerial)
      .set({ status: "expired", updated_at: new Date() })
      .where(eq(inventorySerial.id, input.id))
      .returning();
    const next = assertReturned(updated, "Failed to expire serial.");
    await ctx.audit.write({
      action: AUDIT_ACTION.EXPIRED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.SERIAL,
      newState: { id: input.id, status: "expired" },
    });
    return next;
  });

export const cancelSerial = Workflow.name("inventory.serial.cancel")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchSerialStep, { id: input.id });
    if (current.status === "delivered") {
      throw new Error("Delivered serials cannot be cancelled (cancel the movement instead).");
    }
    if (current.status === "cancelled") {
      return current;
    }
    const [updated] = await ctx.db
      .update(inventorySerial)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(inventorySerial.id, input.id))
      .returning();
    const next = assertReturned(updated, "Failed to cancel serial.");
    await ctx.audit.write({
      action: AUDIT_ACTION.CANCELLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.SERIAL,
      newState: { id: input.id, status: "cancelled" },
    });
    return next;
  });
