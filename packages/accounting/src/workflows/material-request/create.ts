import { accountingMaterialRequest, accountingMaterialRequestItem } from "#/db-schemas/purchase";
import { MATERIAL_REQUEST_EVENTS } from "#/pubsub";
import { CreateMaterialRequestSchema } from "#/schemas/purchase";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateMaterialRequestSchema });

export const createMaterialRequest = Workflow.name("accounting.material-request.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateMaterialRequestSchema, input);

    const [row] = await ctx.db
      .insert(accountingMaterialRequest)
      .values({
        department: parsed.department ?? null,
        request_type: parsed.requestType ?? "purchase",
        required_by: parsed.requiredBy ?? null,
        status: "submitted",
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create material request.");
    }

    await ctx.db.insert(accountingMaterialRequestItem).values(
      parsed.items.map((item) => ({
        item_id: item.itemId,
        material_request_id: row.id,
        qty: toMoney(item.qty ?? 1),
        required_by: parsed.requiredBy ?? null,
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.MATERIAL_REQUEST,
        newState: { requestType: row.request_type },
      });
      await ctx.pubsub.publish(MATERIAL_REQUEST_EVENTS.CREATED, { materialRequestId: row.id });
    });

    return row;
  });
