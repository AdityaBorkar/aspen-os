import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
import { toDateOnly } from "#/services/stock-math";
import {
  AddReconciliationItemsSchema,
  CreateReconciliationSchema,
  IdSchema,
  UpdateReconciliationSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DEFAULT_DIFFERENCE_ACCOUNT } from "#/utils/constants";
import { fetchReconciliationStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

export const createReconciliation = Workflow.name("inventory.reconciliation.create")
  .input(object({ input: CreateReconciliationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReconciliationSchema, input);

    const [reconciliation] = await ctx.db
      .insert(inventoryReconciliation)
      .values({
        difference_account: parsed.differenceAccount ?? DEFAULT_DIFFERENCE_ACCOUNT,
        posting_date: toDateOnly(parsed.postingDate),
        posting_time: parsed.postingTime ?? null,
        purpose: parsed.purpose,
        status: "draft",
      })
      .returning();

    if (!reconciliation) {
      throw new Error("Failed to create reconciliation.");
    }

    await Promise.all(
      parsed.items.map(async (item) => {
        if (item.qty === null && item.valuationRate === null) {
          throw new Error(
            "Each reconciliation row needs a counted quantity, a valuation rate, or both.",
          );
        }
        await ctx.db.insert(inventoryReconciliationItem).values({
          batch_no: item.batchNo ?? null,
          item_id: item.itemId,
          qty: item.qty,
          reconcile_mode: item.reconcileMode ?? null,
          reconciliation_id: reconciliation.id,
          serial_nos: item.serialNos ?? [],
          valuation_rate: item.valuationRate ?? null,
          warehouse_id: item.warehouseId,
        });
      }),
    );

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

    const [updated] = await ctx.db
      .update(inventoryReconciliation)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryReconciliation.id, id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update reconciliation.");
    }

    if (parsed.items !== undefined) {
      await ctx.db
        .delete(inventoryReconciliationItem)
        .where(eq(inventoryReconciliationItem.reconciliation_id, id));
      await Promise.all(
        parsed.items.map((item) =>
          ctx.db.insert(inventoryReconciliationItem).values({
            batch_no: item.batchNo ?? null,
            item_id: item.itemId,
            qty: item.qty,
            reconcile_mode: item.reconcileMode ?? null,
            reconciliation_id: id,
            serial_nos: item.serialNos ?? [],
            valuation_rate: item.valuationRate ?? null,
            warehouse_id: item.warehouseId,
          }),
        ),
      );
    }

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
    const inserted = await Promise.all(
      parsed.items.map(async (item) => {
        if (item.qty === null && item.valuationRate === null) {
          throw new Error(
            "Each reconciliation row needs a counted quantity, a valuation rate, or both.",
          );
        }
        const [row] = await ctx.db
          .insert(inventoryReconciliationItem)
          .values({
            batch_no: item.batchNo ?? null,
            item_id: item.itemId,
            qty: item.qty,
            reconcile_mode: item.reconcileMode ?? null,
            reconciliation_id: parsed.id,
            serial_nos: item.serialNos ?? [],
            valuation_rate: item.valuationRate ?? null,
            warehouse_id: item.warehouseId,
          })
          .returning();
        if (!row) {
          throw new Error("Failed to add reconciliation row.");
        }
        return row;
      }),
    );
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { added: inserted.length, id: parsed.id },
    });
    return inserted;
  });
