import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { getOnHandQty, requireWarehouse } from "#/services/stock-service";
import {
  CreatePutawayRuleSchema,
  IdSchema,
  PositiveQuantitySchema,
  PutawayRuleFiltersSchema,
  UpdatePutawayRuleSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPutawayRuleStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

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
    if (!rule) {
      throw new Error("Failed to create putaway rule.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: rule.id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id: rule.id, item_id: rule.item_id, warehouse_id: rule.warehouse_id },
    });

    return rule;
  });

export const getPutawayRule = Workflow.name("inventory.putaway-rule.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rule = await ctx.step.run(fetchPutawayRuleStep, { id: input.id });
    const onHand = await getOnHandQty(ctx.db, rule.item_id, rule.warehouse_id);
    return { freeSpace: rule.capacity - onHand, onHandQty: onHand, rule };
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
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await ctx.db
      .select()
      .from(inventoryPutawayRule)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
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
    if (!updated) {
      throw new Error("Failed to update putaway rule.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id, is_disabled: updated.is_disabled },
    });

    return updated;
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
    if (!updated) {
      throw new Error("Failed to disable putaway rule.");
    }
    await ctx.audit.write({
      action: AUDIT_ACTION.DISABLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.PUTAWAY_RULE,
      newState: { id: input.id, is_disabled: true },
    });
    return updated;
  });

export const previewPutaway = Workflow.name("inventory.putaway-rule.preview")
  .input(object({ id: IdSchema, qty: PositiveQuantitySchema }))
  .handler(async (input, ctx) => {
    const rule = await ctx.step.run(fetchPutawayRuleStep, { id: input.id });
    const onHand = await getOnHandQty(ctx.db, rule.item_id, rule.warehouse_id);
    const free = rule.capacity - onHand;
    return { fits: free >= input.qty, freeSpace: free, onHandQty: onHand, ruleId: input.id };
  });
