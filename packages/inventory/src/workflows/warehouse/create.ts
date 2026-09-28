import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { WAREHOUSE_EVENTS } from "#/pubsub";
import { requireWarehouse } from "#/services/stock-service";
import { CreateWarehouseSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateWarehouseSchema });

export const createWarehouse = Workflow.name("inventory.warehouse.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateWarehouseSchema, input);

    if (parsed.parentId) {
      const parent = await requireWarehouse(ctx.db, parsed.parentId, {
        allowDisabled: true,
        allowGroup: true,
      });
      if (!parent.is_group) {
        throw new Error("A warehouse can only be created under a group warehouse.");
      }
      if (parent.is_disabled) {
        throw new Error("Cannot create a warehouse under a disabled parent.");
      }
    }

    const [warehouse] = await ctx.db
      .insert(inventoryWarehouse)
      .values({
        account_head: parsed.accountHead ?? null,
        address_id: parsed.addressId ?? null,
        contact_id: parsed.contactId ?? null,
        is_group: parsed.isGroup ?? false,
        name: parsed.name,
        parent_id: parsed.parentId ?? null,
        warehouse_type: parsed.warehouseType ?? "stock",
      })
      .returning();

    if (!warehouse) {
      throw new Error("Failed to create warehouse.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: warehouse.id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE,
      newState: { id: warehouse.id, is_group: warehouse.is_group, name: warehouse.name },
    });

    await ctx.pubsub.publish(WAREHOUSE_EVENTS.CREATED, {
      isGroup: warehouse.is_group,
      name: warehouse.name,
      parentId: warehouse.parent_id ?? undefined,
      warehouseId: warehouse.id,
      warehouseType: warehouse.warehouse_type,
    });

    return warehouse;
  });
