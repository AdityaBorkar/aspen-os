import { accountingFiscalYear } from "#/db-schemas/chart";
import { FISCAL_YEAR_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const closeFiscalYear = Workflow.name("accounting.fiscal-year.close")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingFiscalYear)
      .where(eq(accountingFiscalYear.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Fiscal year "${id}" not found.`);
    }
    if (existing.status === "closed") {
      return existing;
    }

    const [updated] = await ctx.db
      .update(accountingFiscalYear)
      .set({ status: "closed", updated_at: new Date() })
      .where(eq(accountingFiscalYear.id, id))
      .returning();

    const row = assertUpdated(updated, `Fiscal year "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CLOSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FISCAL_YEAR,
        newState: { status: "closed" },
      });
      await ctx.pubsub.publish(FISCAL_YEAR_EVENTS.CLOSED, { fiscalYearId: id });
    });

    return row;
  });
