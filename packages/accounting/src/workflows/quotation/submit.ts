import { accountingQuotation } from "#/db-schemas/sales";
import { QUOTATION_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const submitQuotation = Workflow.name("accounting.quotation.submit")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingQuotation)
      .where(eq(accountingQuotation.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Quotation "${id}" not found.`);
    }
    if (existing.status !== "draft") {
      throw new Error("Only draft quotations can be submitted.");
    }

    const [updated] = await ctx.db
      .update(accountingQuotation)
      .set({ status: "submitted", updated_at: new Date() })
      .where(eq(accountingQuotation.id, id))
      .returning();

    const row = assertUpdated(updated, `Quotation "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.QUOTATION,
        newState: { status: "submitted" },
      });
      await ctx.pubsub.publish(QUOTATION_EVENTS.SUBMITTED, { quotationId: id });
    });

    return row;
  });
