import { healthcarePurchaseOrder } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { PoCreateSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PoCreateInputSchema = object({ input: PoCreateSchema });

interface PoLine {
  [key: string]: string | number;
  itemId: string;
  qty: number;
}
export const poCreate = Workflow.name("pharmacy.po-create")
  .input(PoCreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PoCreateSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (parsed.items.length === 0) {
      throw new Error("Purchase order needs at least one line item.");
    }

    const poNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "po" } });
    const poItems: PoLine[] = parsed.items.map((line) => ({ itemId: line.itemId, qty: line.qty }));
    const created = await ctx.step.run("create-po", async () => {
      const [row] = await ctx.db
        .insert(healthcarePurchaseOrder)
        .values({
          branch_id: branchId,
          note: parsed.note ?? null,
          payload: { items: poItems },
          po_no: `PO-${String(poNo).padStart(6, "0")}`,
          status: "draft",
          vendor: parsed.vendor,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to create purchase order.");
      }
      return row;
    });

    const dto = {
      createdAt: created.created_at.toISOString(),
      id: created.id,
      items: parsed.items,
      note: created.note,
      poNo: created.po_no,
      status: created.status,
      vendor: created.vendor,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, poNo: created.po_no, vendor: created.vendor },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
