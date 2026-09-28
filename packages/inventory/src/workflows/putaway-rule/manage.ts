import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { getOnHandQty, requireWarehouse, asDb } from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";
import {
  CreatePutawayRuleSchema,
  IdSchema,
  PositiveQuantitySchema,
  PutawayRuleFiltersSchema,
  UpdatePutawayRuleSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPutawayRuleStep } from "#/workflow-steps/fetch-inventory";
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export async function getPutawayAvailability(
  db: DbOrTx,
  ruleId: string,
): Promise<{ freeSpace: number; onHandQty: number; ruleId: string }> {
  const handle = asDb(db);
  const [rule] = await handle
    .select()
    .from(inventoryPutawayRule)
    .where(eq(inventoryPutawayRule.id, ruleId))
    .limit(1);
  const source = assertReturned(rule, `Putaway rule "${ruleId}" not found.`);
  const onHand = await getOnHandQty(db, source.item_id, source.warehouse_id);
  return { freeSpace: source.capacity - onHand, onHandQty: onHand, ruleId };
}

export const createPutawayRule = Workflow.name("inventory.putaway-rule.create")
  .input(object({ input: CreatePutawayRuleSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePutawayRuleSchema, input);
    await requireWarehouse(ctx.db, parsed.warehouseId);
    if (parsed.capacity <= 0) {
      throw new Error("Putaway capacity must be greater than zero.");
    }

    const [rule] = await ctx.db
      .insert(inventoryPutawayRule)
      .values({
        capacity: parsed.capacity,
        capacity_uom: parsed.capacityUom,
        item_id: parsed.itemId,
        priority: parsed.priority ?? 1,
        warehouse_id: parsed.warehouseId,
      })
      .returning();
    const created = assertReturned(rule, "Failed to create putaway rule.");

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id: created.id, item_id: created.item_id, warehouse_id: created.warehouse_id },
    });

    return created;
  });

export const getPutawayRule = Workflow.name("inventory.putaway-rule.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rule = await ctx.step.run(fetchPutawayRuleStep, { id: input.id });
    const availability = await getPutawayAvailability(ctx.db, rule.id);
    return { freeSpace: availability.freeSpace, onHandQty: availability.onHandQty, rule };
  });

export const listPutawayRules = Workflow.name("inventory.putaway-rule.list")
  .input(object({ filters: PutawayRuleFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(PutawayRuleFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (!parsed.includeDisabled) {
      conditions.push(eq(inventoryPutawayRule.is_disabled, false));
    }
    if (parsed.itemId) {
      conditions.push(eq(inventoryPutawayRule.item_id, parsed.itemId));
    }
    if (parsed.warehouseId) {
      conditions.push(eq(inventoryPutawayRule.warehouse_id, parsed.warehouseId));
    }
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryPutawayRule)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

export const updatePutawayRule = Workflow.name("inventory.putaway-rule.update")
  .input(object({ id: IdSchema, patch: UpdatePutawayRuleSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdatePutawayRuleSchema, patch);
    const current = await ctx.step.run(fetchPutawayRuleStep, { id });
    if (current.is_disabled) {
      throw new Error(
        "Disabled putaway rules cannot be edited (re-enable by creating a new rule).",
      );
    }
    if (parsed.capacity !== undefined && parsed.capacity <= 0) {
      throw new Error("Putaway capacity must be greater than zero.");
    }

    const values: Partial<typeof inventoryPutawayRule.$inferInsert> = {};
    if (parsed.capacity !== undefined) {
      values.capacity = parsed.capacity;
    }
    if (parsed.capacityUom !== undefined) {
      values.capacity_uom = parsed.capacityUom;
    }
    if (parsed.isDisabled !== undefined) {
      values.is_disabled = parsed.isDisabled;
    }
    if (parsed.priority !== undefined) {
      values.priority = parsed.priority;
    }

    const [updated] = await ctx.db
      .update(inventoryPutawayRule)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryPutawayRule.id, id))
      .returning();
    const next = assertReturned(updated, "Failed to update putaway rule.");

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id, is_disabled: next.is_disabled },
    });

    return next;
  });

export const disablePutawayRule = Workflow.name("inventory.putaway-rule.disable")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPutawayRuleStep, { id: input.id });
    if (current.is_disabled) {
      return current;
    }
    const [updated] = await ctx.db
      .update(inventoryPutawayRule)
      .set({ is_disabled: true, updated_at: new Date() })
      .where(eq(inventoryPutawayRule.id, input.id))
      .returning();
    const next = assertReturned(updated, "Failed to disable putaway rule.");
    await ctx.audit.write({
      action: AUDIT_ACTION.DISABLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id: input.id, is_disabled: true },
    });
    return next;
  });

export const previewPutaway = Workflow.name("inventory.putaway-rule.preview")
  .input(object({ id: IdSchema, qty: PositiveQuantitySchema }))
  .handler(async (input, ctx) => {
    const availability = await getPutawayAvailability(ctx.db, input.id);
    return {
      fits: availability.freeSpace >= input.qty,
      freeSpace: availability.freeSpace,
      onHandQty: availability.onHandQty,
      ruleId: input.id,
    };
  });
