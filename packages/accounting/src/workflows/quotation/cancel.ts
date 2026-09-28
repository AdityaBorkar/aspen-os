import { accountingQuotation } from "#/db-schemas/sales";
import { QUOTATION_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const CancelInputSchema = object({ id: string() });

export const cancelQuotation = Workflow.name("accounting.quotation.cancel")
  .input(CancelInputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingQuotation)
      .where(eq(accountingQuotation.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Quotation "${id}" not found.`);
    }
    if (existing.status === "cancelled") {
      return existing;
    }
    if (existing.status === "ordered") {
      throw new Error("Ordered quotations cannot be cancelled.");
    }

    const [updated] = await ctx.db
      .update(accountingQuotation)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(accountingQuotation.id, id))
      .returning();

    const row = assertUpdated(updated, `Quotation "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.QUOTATION,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(QUOTATION_EVENTS.CANCELLED, { quotationId: id });
    });

    return row;
  });
