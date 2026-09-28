import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { BATCH_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { getBatchBalance } from "#/services/stock-posting";
import { requireWarehouse } from "#/services/stock-service";
import {
  BatchFiltersSchema,
  CreateBatchSchema,
  ExpiringBatchesSchema,
  IdSchema,
  MoveBatchSchema,
  SplitBatchSchema,
  UpdateBatchSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBatchStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const createBatch = Workflow.name("inventory.batch.create")
  .input(object({ input: CreateBatchSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBatchSchema, input);
    const [existing] = await ctx.db
      .select({ id: inventoryBatch.id })
      .from(inventoryBatch)
      .where(
        and(eq(inventoryBatch.item_id, parsed.itemId), eq(inventoryBatch.batch_id, parsed.batchId)),
      )
      .limit(1);
    if (existing) {
      throw new Error(`Batch "${parsed.batchId}" already exists for this item.`);
    }

    const [batch] = await ctx.db
      .insert(inventoryBatch)
      .values({
        batch_id: parsed.batchId,
        expiry_date: parsed.expiryDate ? toDateOnly(parsed.expiryDate) : null,
        item_id: parsed.itemId,
        manufacturing_date: parsed.manufacturingDate ? toDateOnly(parsed.manufacturingDate) : null,
        status: "active",
        supplier_id: parsed.supplierId ?? null,
      })
      .returning();
    if (!batch) {
      throw new Error("Failed to create batch.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: batch.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: batch.batch_id, id: batch.id, item_id: batch.item_id },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.CREATED, {
      batchId: batch.batch_id,
      batchRecordId: batch.id,
      itemId: batch.item_id,
    });

    return batch;
  });

export const getBatch = Workflow.name("inventory.batch.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchBatchStep, { id: input.id }));

export const listBatches = Workflow.name("inventory.batch.list")
  .input(object({ filters: BatchFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(BatchFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.itemId) {
      conditions.push(eq(inventoryBatch.item_id, parsed.itemId));
    }
    if (parsed.status) {
      conditions.push(eq(inventoryBatch.status, parsed.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await ctx.db
      .select()
      .from(inventoryBatch)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
    return rows;
  });

export const updateBatch = Workflow.name("inventory.batch.update")
  .input(object({ id: IdSchema, patch: UpdateBatchSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateBatchSchema, patch);
    const current = await ctx.step.run(fetchBatchStep, { id });

    const values: Partial<typeof inventoryBatch.$inferInsert> = {};
    if (parsed.expiryDate !== undefined) {
      values.expiry_date = parsed.expiryDate ? toDateOnly(parsed.expiryDate) : null;
    }
    if (parsed.manufacturingDate !== undefined) {
      values.manufacturing_date = parsed.manufacturingDate
        ? toDateOnly(parsed.manufacturingDate)
        : null;
    }
    if (parsed.status !== undefined) {
      values.status = parsed.status;
    }
    if (parsed.supplierId !== undefined) {
      values.supplier_id = parsed.supplierId;
    }

    const [updated] = await ctx.db
      .update(inventoryBatch)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryBatch.id, id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update batch.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: updated.batch_id, id, status: updated.status },
      previousState: { batch_id: current.batch_id, id, status: current.status },
    });

    return updated;
  });

export const splitBatch = Workflow.name("inventory.batch.split")
  .input(object({ input: SplitBatchSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SplitBatchSchema, input);
    const source = await ctx.step.run(fetchBatchStep, { id: parsed.id });
    if (source.status !== "active") {
      throw new Error("Only active batches can be split.");
    }
    const [duplicate] = await ctx.db
      .select({ id: inventoryBatch.id })
      .from(inventoryBatch)
      .where(
        and(
          eq(inventoryBatch.item_id, source.item_id),
          eq(inventoryBatch.batch_id, parsed.newBatchId),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw new Error(`Batch "${parsed.newBatchId}" already exists for this item.`);
    }

    const [created] = await ctx.db
      .insert(inventoryBatch)
      .values({
        batch_id: parsed.newBatchId,
        expiry_date: source.expiry_date,
        item_id: source.item_id,
        manufacturing_date: source.manufacturing_date,
        status: "active",
        supplier_id: source.supplier_id,
      })
      .returning();
    if (!created) {
      throw new Error("Failed to split batch.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.SPLIT,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: created.batch_id, id: created.id, splitFrom: source.batch_id },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.SPLIT, {
      batchId: created.batch_id,
      batchRecordId: created.id,
      itemId: created.item_id,
    });

    return created;
  });

export const moveBatch = Workflow.name("inventory.batch.move")
  .input(object({ input: MoveBatchSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MoveBatchSchema, input);
    if (parsed.sourceWarehouseId === parsed.targetWarehouseId) {
      throw new Error("Source and target warehouses must differ.");
    }
    await requireWarehouse(ctx.db, parsed.sourceWarehouseId);
    await requireWarehouse(ctx.db, parsed.targetWarehouseId);
    const today = toDateOnly(new Date().toISOString());
    const [batch] = await ctx.db
      .select()
      .from(inventoryBatch)
      .where(
        and(eq(inventoryBatch.item_id, parsed.itemId), eq(inventoryBatch.batch_id, parsed.batchNo)),
      )
      .limit(1);
    if (!batch) {
      throw new Error(`Batch "${parsed.batchNo}" does not exist for this item.`);
    }
    if (batch.status === "expired" || (batch.expiry_date && batch.expiry_date < today)) {
      throw new Error(`Batch "${parsed.batchNo}" is expired and cannot be moved.`);
    }
    const balance = await getBatchBalance(ctx.db, {
      batchNo: parsed.batchNo,
      itemId: parsed.itemId,
      warehouseId: parsed.sourceWarehouseId,
    });
    if (balance - parsed.qty < 0) {
      throw new Error(`Insufficient batch stock to move (have ${balance}, need ${parsed.qty}).`);
    }

    const [rateRow] = await ctx.db
      .select({
        qty: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)`,
        total: sql<number>`coalesce(sum(${inventoryStockLedger.qty_delta} * ${inventoryStockLedger.valuation_rate}), 0)`,
      })
      .from(inventoryStockLedger)
      .where(
        and(
          eq(inventoryStockLedger.item_id, parsed.itemId),
          eq(inventoryStockLedger.warehouse_id, parsed.sourceWarehouseId),
          eq(inventoryStockLedger.batch_no, parsed.batchNo),
        ),
      );
    const batchQty = rateRow?.qty ?? 0;
    const rate = batchQty > 0 ? (rateRow?.total ?? 0) / batchQty : 0;

    await ctx.db.insert(inventoryStockLedger).values({
      batch_no: parsed.batchNo,
      item_id: parsed.itemId,
      posting_date: today,
      qty_delta: -parsed.qty,
      valuation_rate: rate,
      voucher_id: batch.id,
      voucher_type: "batch_move",
      warehouse_id: parsed.sourceWarehouseId,
    });
    await ctx.db.insert(inventoryStockLedger).values({
      batch_no: parsed.batchNo,
      item_id: parsed.itemId,
      posting_date: today,
      qty_delta: parsed.qty,
      valuation_rate: rate,
      voucher_id: batch.id,
      voucher_type: "batch_move",
      warehouse_id: parsed.targetWarehouseId,
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.MOVED,
      crudAction: "update",
      entityId: batch.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: batch.batch_id, id: batch.id, qty: parsed.qty },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.MOVED, {
      batchId: batch.batch_id,
      batchRecordId: batch.id,
      itemId: batch.item_id,
    });

    const remaining = await getBatchBalance(ctx.db, {
      batchNo: parsed.batchNo,
      itemId: parsed.itemId,
      warehouseId: parsed.sourceWarehouseId,
    });
    return { batchId: batch.batch_id, movedQty: parsed.qty, rate, remainingSourceQty: remaining };
  });

export const expireBatch = Workflow.name("inventory.batch.expire")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBatchStep, { id: input.id });
    if (current.status === "expired") {
      return current;
    }
    const [updated] = await ctx.db
      .update(inventoryBatch)
      .set({ status: "expired", updated_at: new Date() })
      .where(eq(inventoryBatch.id, input.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to expire batch.");
    }
    await ctx.audit.write({
      action: AUDIT_ACTION.EXPIRED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { id: input.id, status: "expired" },
    });
    await ctx.pubsub.publish(BATCH_EVENTS.EXPIRED, {
      batchId: updated.batch_id,
      batchRecordId: updated.id,
      itemId: updated.item_id,
    });
    return updated;
  });

export const listExpiringBatches = Workflow.name("inventory.batch.expiring")
  .input(object({ filters: ExpiringBatchesSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(ExpiringBatchesSchema, filters);
    const horizon = new Date(Date.now() + (parsed.daysAhead ?? 30) * 86_400_000);
    const horizonOnly = toDateOnly(horizon.toISOString());
    const rows = await ctx.db
      .select()
      .from(inventoryBatch)
      .where(
        and(
          eq(inventoryBatch.status, "active"),
          sql`${inventoryBatch.expiry_date} IS NOT NULL AND ${inventoryBatch.expiry_date} <= ${horizonOnly}`,
        ),
      );
    return rows;
  });
