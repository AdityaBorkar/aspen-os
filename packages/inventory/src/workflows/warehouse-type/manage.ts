import { inventoryWarehouseType } from "#/db-schemas/warehouse-type";
import {
  CreateWarehouseTypeSchema,
  IdSchema,
  UpdateWarehouseTypeSchema,
  WarehouseTypeFiltersSchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WAREHOUSE_TYPE } from "#/utils/constants";
import { fetchWarehouseTypeStep } from "#/workflow-steps/fetch-inventory";
import { assertReturned } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SEED_TYPES = [
  { code: WAREHOUSE_TYPE.STOCK, description: "Default stock storage", name: "Stock" },
  { code: WAREHOUSE_TYPE.WIP, description: "Work in progress", name: "WIP" },
  {
    code: WAREHOUSE_TYPE.TRANSIT,
    description: "In-transit staging for two-leg transfers",
    name: "Transit",
  },
  { code: WAREHOUSE_TYPE.SUPPLIER, description: "Supplier-side storage", name: "Supplier" },
  { code: WAREHOUSE_TYPE.CUSTOMER, description: "Customer-side storage", name: "Customer" },
  { code: WAREHOUSE_TYPE.ROOM, description: "Storage room grouping", name: "Room" },
  { code: WAREHOUSE_TYPE.SHELF, description: "Shelf grouping", name: "Shelf" },
  { code: WAREHOUSE_TYPE.BIN, description: "Bin-level leaf storage", name: "Bin" },
];

export const seedWarehouseTypes = Workflow.name("inventory.warehouse-type.seed")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const existing = await ctx.db
      .select({ code: inventoryWarehouseType.code })
      .from(inventoryWarehouseType);
    const known = new Set(existing.map((row) => row.code));
    const inserted = await Promise.all(
      SEED_TYPES.filter((seed) => !known.has(seed.code)).map((seed) =>
        ctx.db.insert(inventoryWarehouseType).values(seed).returning(),
      ),
    );
    const created = inserted.flatMap(([row]) => (row ? [row] : []));
    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: "warehouse-type-seed",
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE_TYPE,
      newState: { seeded: created.length },
    });
    return created;
  });

export const createWarehouseType = Workflow.name("inventory.warehouse-type.create")
  .input(object({ input: CreateWarehouseTypeSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateWarehouseTypeSchema, input);
    const [row] = await ctx.db
      .insert(inventoryWarehouseType)
      .values({
        code: parsed.code,
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();
    const created = assertReturned(row, "Failed to create warehouse type.");
    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE_TYPE,
      newState: { code: created.code, id: created.id, name: created.name },
    });
    return created;
  });

export const getWarehouseType = Workflow.name("inventory.warehouse-type.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchWarehouseTypeStep, { id: input.id }));

export const listWarehouseTypes = Workflow.name("inventory.warehouse-type.list")
  .input(object({ filters: WarehouseTypeFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(WarehouseTypeFiltersSchema, filters);
    const where = parsed.includeDisabled
      ? undefined
      : eq(inventoryWarehouseType.is_disabled, false);
    const rows = await ctx.db
      .select()
      .from(inventoryWarehouseType)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
    return rows;
  });

export const updateWarehouseType = Workflow.name("inventory.warehouse-type.update")
  .input(object({ id: IdSchema, patch: UpdateWarehouseTypeSchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateWarehouseTypeSchema, patch);
    const current = await ctx.step.run(fetchWarehouseTypeStep, { id });
    const values: Partial<typeof inventoryWarehouseType.$inferInsert> = {};
    if (parsed.description !== undefined) {
      values.description = parsed.description;
    }
    if (parsed.isDisabled !== undefined) {
      values.is_disabled = parsed.isDisabled;
    }
    if (parsed.name !== undefined) {
      values.name = parsed.name;
    }
    const [updated] = await ctx.db
      .update(inventoryWarehouseType)
      .set({ ...values, updated_at: new Date() })
      .where(eq(inventoryWarehouseType.id, id))
      .returning();
    const next = assertReturned(updated, "Failed to update warehouse type.");
    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE_TYPE,
      newState: { id: next.id, name: next.name },
      previousState: { id: current.id, name: current.name },
    });
    return next;
  });

export const disableWarehouseType = Workflow.name("inventory.warehouse-type.disable")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchWarehouseTypeStep, { id: input.id });
    if (current.is_disabled) {
      return current;
    }
    const [updated] = await ctx.db
      .update(inventoryWarehouseType)
      .set({ is_disabled: true, updated_at: new Date() })
      .where(
        and(eq(inventoryWarehouseType.id, input.id), eq(inventoryWarehouseType.is_disabled, false)),
      )
      .returning();
    const next = assertReturned(updated, "Failed to disable warehouse type.");
    await ctx.audit.write({
      action: AUDIT_ACTION.DISABLED,
      crudAction: "update",
      entityId: input.id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE_TYPE,
      newState: { id: next.id, is_disabled: true },
    });
    return next;
  });
