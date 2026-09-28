import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { BATCH_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { getBatchBalance } from "#/services/stock-posting";
import { requireWarehouse, asDb } from "#/services/stock-service";
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
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const MS_PER_DAY = 86_400_000;

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
    const created = assertReturned(batch, "Failed to create batch.");

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: created.batch_id, id: created.id, item_id: created.item_id },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.CREATED, {
      batchId: created.batch_id,
      batchRecordId: created.id,
      itemId: created.item_id,
    });

    return created;
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
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryBatch)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
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
    const next = assertReturned(updated, "Failed to update batch.");

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: next.batch_id, id, status: next.status },
      previousState: { batch_id: current.batch_id, id, status: current.status },
    });

    return next;
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
    const next = assertReturned(created, "Failed to split batch.");

    await ctx.audit.write({
      action: AUDIT_ACTION.SPLIT,
      crudAction: "create",
      entityId: next.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: next.batch_id, id: next.id, splitFrom: source.batch_id },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.SPLIT, {
      batchId: next.batch_id,
      batchRecordId: next.id,
      itemId: next.item_id,
    });

    return next;
  });

export const moveBatch = Workflow.name("inventory.batch.move")
  .input(object({ input: MoveBatchSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MoveBatchSchema, input);
    if (parsed.sourceWarehouseId === parsed.targetWarehouseId) {
      throw new Error("Source and target warehouses must differ.");
    }
    const result = await ctx.db.transaction(async (tx) => {
      const db = asDb(tx);
      await requireWarehouse(db, parsed.sourceWarehouseId);
      await requireWarehouse(db, parsed.targetWarehouseId);
      const today = toDateOnly(new Date().toISOString());
      const [batch] = await db
        .select()
        .from(inventoryBatch)
        .where(
          and(
            eq(inventoryBatch.item_id, parsed.itemId),
            eq(inventoryBatch.batch_id, parsed.batchNo),
          ),
        )
        .limit(1);
      const source = assertReturned(
        batch,
        `Batch "${parsed.batchNo}" does not exist for this item.`,
      );
      if (source.status === "expired" || (source.expiry_date && source.expiry_date < today)) {
        throw new Error(`Batch "${parsed.batchNo}" is expired and cannot be moved.`);
      }
      const balance = await getBatchBalance(db, {
        batchNo: parsed.batchNo,
        itemId: parsed.itemId,
        warehouseId: parsed.sourceWarehouseId,
      });
      if (balance - parsed.qty < 0) {
        throw new Error(`Insufficient batch stock to move (have ${balance}, need ${parsed.qty}).`);
      }

      const [rateRow] = await db
        .select({
          qty: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta}), 0)`,
          total: sql<string>`coalesce(sum(${inventoryStockLedger.qty_delta} * ${inventoryStockLedger.valuation_rate}), 0)`,
        })
        .from(inventoryStockLedger)
        .where(
          and(
            eq(inventoryStockLedger.item_id, parsed.itemId),
            eq(inventoryStockLedger.warehouse_id, parsed.sourceWarehouseId),
            eq(inventoryStockLedger.batch_no, parsed.batchNo),
          ),
        );
      const batchQty = Number(rateRow?.qty ?? 0);
      const rate = batchQty > 0 ? Number(rateRow?.total ?? 0) / batchQty : 0;

      await db.insert(inventoryStockLedger).values([
        {
          batch_no: parsed.batchNo,
          item_id: parsed.itemId,
          posting_date: today,
          qty_delta: -parsed.qty,
          valuation_rate: rate,
          voucher_id: source.id,
          voucher_type: "batch_move",
          warehouse_id: parsed.sourceWarehouseId,
        },
        {
          batch_no: parsed.batchNo,
          item_id: parsed.itemId,
          posting_date: today,
          qty_delta: parsed.qty,
          valuation_rate: rate,
          voucher_id: source.id,
          voucher_type: "batch_move",
          warehouse_id: parsed.targetWarehouseId,
        },
      ]);
      return { batch: source, rate };
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.MOVED,
      crudAction: "update",
      entityId: result.batch.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { batch_id: result.batch.batch_id, id: result.batch.id, qty: parsed.qty },
    });

    await ctx.pubsub.publish(BATCH_EVENTS.MOVED, {
      batchId: result.batch.batch_id,
      batchRecordId: result.batch.id,
      itemId: result.batch.item_id,
    });

    const remaining = await getBatchBalance(ctx.db, {
      batchNo: parsed.batchNo,
      itemId: parsed.itemId,
      warehouseId: parsed.sourceWarehouseId,
    });
    return {
      batchId: result.batch.batch_id,
      movedQty: parsed.qty,
      rate: result.rate,
      remainingSourceQty: remaining,
    };
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
    const next = assertReturned(updated, "Failed to expire batch.");
    await ctx.audit.write({
      action: AUDIT_ACTION.EXPIRED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.BATCH,
      newState: { id: input.id, status: "expired" },
    });
    await ctx.pubsub.publish(BATCH_EVENTS.EXPIRED, {
      batchId: next.batch_id,
      batchRecordId: next.id,
      itemId: next.item_id,
    });
    return next;
  });

export const listExpiringBatches = Workflow.name("inventory.batch.expiring")
  .input(object({ filters: ExpiringBatchesSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(ExpiringBatchesSchema, filters);
    const horizon = new Date(Date.now() + (parsed.daysAhead ?? 30) * MS_PER_DAY);
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
