import { accountingFiscalYear } from "#/db-schemas/chart";
import { FISCAL_YEAR_EVENTS } from "#/pubsub";
import { CreateFiscalYearSchema } from "#/schemas/chart";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateFiscalYearSchema });

export const createFiscalYear = Workflow.name("accounting.fiscal-year.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFiscalYearSchema, input);
    if (parsed.startDate >= parsed.endDate) {
      throw new Error("Fiscal year startDate must be before endDate.");
    }

    const [row] = await ctx.db
      .insert(accountingFiscalYear)
      .values({
        end_date: parsed.endDate,
        name: parsed.name,
        start_date: parsed.startDate,
        status: "open",
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create fiscal year.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.FISCAL_YEAR,
        newState: { name: row.name, status: row.status },
      });
      await ctx.pubsub.publish(FISCAL_YEAR_EVENTS.STARTED, {
        fiscalYear: { id: row.id, name: row.name },
      });
    });

    return row;
  });
