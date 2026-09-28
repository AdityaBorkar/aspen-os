import { accountingRfq, accountingRfqItem } from "#/db-schemas/purchase";
import { RFQ_EVENTS } from "#/pubsub";
import { CreateRfqSchema } from "#/schemas/purchase";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateRfqSchema });

export const createRfq = Workflow.name("accounting.rfq.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRfqSchema, input);

    const [rfq] = await ctx.db
      .insert(accountingRfq)
      .values({
        deadline: parsed.deadline ?? null,
        material_request_id: parsed.materialRequestId ?? null,
        required_by: parsed.requiredBy ?? null,
        status: "submitted",
      })
      .returning();

    if (!rfq) {
      throw new Error("Failed to create RFQ.");
    }

    await ctx.db.insert(accountingRfqItem).values(
      parsed.items.map((item) => ({
        item_id: item.itemId,
        qty: toMoney(item.qty ?? 1),
        rfq_id: rfq.id,
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: rfq.id,
        entityType: AUDIT_ENTITY_TYPE.RFQ,
        newState: { status: rfq.status },
      });
      await ctx.pubsub.publish(RFQ_EVENTS.ISSUED, { rfqId: rfq.id });
    });

    return rfq;
  });
