import { accountingDeliveryNote } from "#/db-schemas/sales";
import { DELIVERY_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelDeliveryNote = Workflow.name("accounting.delivery.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingDeliveryNote)
      .where(eq(accountingDeliveryNote.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Delivery note "${id}" not found.`);
    }
    if (existing.status === "cancelled") {
      return existing;
    }

    const [updated] = await ctx.db
      .update(accountingDeliveryNote)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(accountingDeliveryNote.id, id))
      .returning();

    const row = assertUpdated(updated, `Delivery note "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DELIVERY,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(DELIVERY_EVENTS.CANCELLED, { deliveryId: id });
    });

    return row;
  });
