import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { WAREHOUSE_EVENTS } from "#/pubsub";
import { requireGroupParent } from "#/services/stock-service";
import { CreateWarehouseSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertReturned } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateWarehouseSchema });

export const createWarehouse = Workflow.name("inventory.warehouse.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateWarehouseSchema, input);

    if (parsed.parentId) {
      await requireGroupParent(ctx.db, parsed.parentId);
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

    const created = assertReturned(warehouse, "Failed to create warehouse.");

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: created.id,
      entityType: AUDIT_ENTITY_TYPE.WAREHOUSE,
      newState: { id: created.id, is_group: created.is_group, name: created.name },
    });

    await ctx.pubsub.publish(WAREHOUSE_EVENTS.CREATED, {
      isGroup: created.is_group,
      name: created.name,
      parentId: created.parent_id ?? undefined,
      warehouseId: created.id,
      warehouseType: created.warehouse_type,
    });

    return created;
  });
