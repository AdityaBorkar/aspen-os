import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
import { toDateOnly } from "#/services/stock-math";
import {
  AddReconciliationItemsSchema,
  CreateReconciliationSchema,
  IdSchema,
  UpdateReconciliationSchema,
} from "#/types";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  DEFAULT_DIFFERENCE_ACCOUNT,
  DEFAULT_OPENING_DIFFERENCE_ACCOUNT,
  RECONCILIATION_PURPOSE,
} from "#/utils/constants";
import { fetchReconciliationStep } from "#/workflow-steps/fetch-inventory";
import { assertReturned } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

function defaultDifferenceAccount(purpose: string): string {
  return purpose === RECONCILIATION_PURPOSE.OPENING_STOCK
    ? DEFAULT_OPENING_DIFFERENCE_ACCOUNT
    : DEFAULT_DIFFERENCE_ACCOUNT;
}

export const createReconciliation = Workflow.name("inventory.reconciliation.create")
  .input(object({ input: CreateReconciliationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReconciliationSchema, input);

    const reconciliation = await ctx.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(inventoryReconciliation)
        .values({
          difference_account: parsed.differenceAccount ?? defaultDifferenceAccount(parsed.purpose),
          posting_date: toDateOnly(parsed.postingDate),
          posting_time: parsed.postingTime ?? null,
          purpose: parsed.purpose,
          status: "draft",
        })
        .returning();
      const created = assertReturned(header, "Failed to create reconciliation.");

      for (const item of parsed.items) {
        if (item.qty === null && item.valuationRate === null) {
          throw new Error(
            "Each reconciliation row needs a counted quantity, a valuation rate, or both.",
          );
        }
      }
      await tx.insert(inventoryReconciliationItem).values(
        parsed.items.map((item) => ({
          batch_no: item.batchNo ?? null,
          item_id: item.itemId,
          qty: item.qty,
          reconcile_mode: item.reconcileMode ?? null,
          reconciliation_id: created.id,
          serial_nos: item.serialNos ?? [],
          valuation_rate: item.valuationRate ?? null,
          warehouse_id: item.warehouseId,
        })),
      );
      return created;
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: reconciliation.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: {
        id: reconciliation.id,
        purpose: reconciliation.purpose,
        status: reconciliation.status,
      },
    });

    return reconciliation;
  });

export const getReconciliation = Workflow.name("inventory.reconciliation.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const reconciliation = await ctx.step.run(fetchReconciliationStep, { id: input.id });
    const items = await ctx.db
      .select()
      .from(inventoryReconciliationItem)
      .where(eq(inventoryReconciliationItem.reconciliation_id, input.id));
    return { items, reconciliation };
  });

export const updateReconciliation = Workflow.name("inventory.reconciliation.update")
  .input(object({ id: IdSchema, patch: UpdateReconciliationSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateReconciliationSchema, patch);
    const current = await ctx.step.run(fetchReconciliationStep, { id });
    if (current.status !== "draft") {
      throw new Error("Only draft reconciliations can be edited.");
    }

    const updated = await ctx.db.transaction(async (tx) => {
      const values: Partial<typeof inventoryReconciliation.$inferInsert> = {};
      if (parsed.differenceAccount !== undefined) {
        values.difference_account = parsed.differenceAccount;
      }
      if (parsed.postingDate !== undefined) {
        values.posting_date = toDateOnly(parsed.postingDate);
      }
      if (parsed.postingTime !== undefined) {
        values.posting_time = parsed.postingTime;
      }
      const [row] = await tx
        .update(inventoryReconciliation)
        .set({ ...values, updated_at: new Date() })
        .where(eq(inventoryReconciliation.id, id))
        .returning();
      const next = assertReturned(row, "Failed to update reconciliation.");

      if (parsed.items !== undefined) {
        await tx
          .delete(inventoryReconciliationItem)
          .where(eq(inventoryReconciliationItem.reconciliation_id, id));
        if (parsed.items.length > 0) {
          await tx.insert(inventoryReconciliationItem).values(
            parsed.items.map((item) => ({
              batch_no: item.batchNo ?? null,
              item_id: item.itemId,
              qty: item.qty,
              reconcile_mode: item.reconcileMode ?? null,
              reconciliation_id: id,
              serial_nos: item.serialNos ?? [],
              valuation_rate: item.valuationRate ?? null,
              warehouse_id: item.warehouseId,
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
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { id, status: "draft" },
    });

    return updated;
  });

export const addReconciliationItems = Workflow.name("inventory.reconciliation.add-items")
  .input(object({ input: AddReconciliationItemsSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddReconciliationItemsSchema, input);
    const current = await ctx.step.run(fetchReconciliationStep, { id: parsed.id });
    if (current.status !== "draft") {
      throw new Error("Items can only be added to draft reconciliations.");
    }
    for (const item of parsed.items) {
      if (item.qty === null && item.valuationRate === null) {
        throw new Error(
          "Each reconciliation row needs a counted quantity, a valuation rate, or both.",
        );
      }
    }
    const inserted = await ctx.db
      .insert(inventoryReconciliationItem)
      .values(
        parsed.items.map((item) => ({
          batch_no: item.batchNo ?? null,
          item_id: item.itemId,
          qty: item.qty,
          reconcile_mode: item.reconcileMode ?? null,
          reconciliation_id: parsed.id,
          serial_nos: item.serialNos ?? [],
          valuation_rate: item.valuationRate ?? null,
          warehouse_id: item.warehouseId,
        })),
      )
      .returning();
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { added: inserted.length, id: parsed.id },
    });
    return inserted;
  });
