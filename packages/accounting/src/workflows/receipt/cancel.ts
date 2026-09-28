import { accountingReceiptNote } from "#/db-schemas/purchase";
import { RECEIPT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelReceiptNote = Workflow.name("accounting.receipt.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingReceiptNote)
      .where(eq(accountingReceiptNote.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Receipt note "${id}" not found.`);
    }
    if (existing.status === "cancelled") {
      return existing;
    }
    const [updated] = await ctx.db
      .update(accountingReceiptNote)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(accountingReceiptNote.id, id))
      .returning();
    const row = assertUpdated(updated, `Receipt note "${id}"`);
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.RECEIPT,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(RECEIPT_EVENTS.CANCELLED, { receiptId: id });
    });
    return row;
  });
